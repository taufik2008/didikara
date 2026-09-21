/**
 * SCORM 1.2 & SCORM 2004 JavaScript Runtime API Adapter
 * Memungkinkan pemutaran modul e-learning standar industri (Articulate Storyline,
 * Adobe Captivate, iSpring, Canva SCORM) langsung di dalam LMS Pintar.
 */

export function createScorm12Adapter({
  userId,
  userName,
  lessonId,
  initialLocation = "",
  initialStatus = "incomplete",
  onCommit = () => {},
}) {
  const cmiData = {
    "cmi.core.student_id": String(userId || "STUDENT-001"),
    "cmi.core.student_name": String(userName || "Peserta Pelatihan"),
    "cmi.core.lesson_location": initialLocation,
    "cmi.core.credit": "credit",
    "cmi.core.lesson_status": initialStatus, // 'passed' | 'completed' | 'failed' | 'incomplete' | 'browsed' | 'not attempted'
    "cmi.core.entry": "ab-initio",
    "cmi.core.score.raw": "0",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.core.total_time": "00:00:00",
    "cmi.core.lesson_mode": "normal",
    "cmi.core.exit": "",
    "cmi.core.session_time": "00:00:00",
    "cmi.suspend_data": "",
    "cmi.launch_data": "",
    "cmi.comments": "",
  };

  let isInitialized = false;
  let lastError = "0";

  const api = {
    LMSInitialize: function (param) {
      isInitialized = true;
      lastError = "0";
      return "true";
    },

    LMSFinish: function (param) {
      if (!isInitialized) {
        lastError = "301";
        return "false";
      }
      isInitialized = false;
      onCommit({ ...cmiData, finished: true });
      return "true";
    },

    LMSGetValue: function (element) {
      if (!isInitialized) {
        lastError = "301";
        return "";
      }
      if (element in cmiData) {
        lastError = "0";
        return cmiData[element];
      }
      lastError = "401"; // Undefined data model element
      return "";
    },

    LMSSetValue: function (element, value) {
      if (!isInitialized) {
        lastError = "301";
        return "false";
      }
      cmiData[element] = String(value);
      lastError = "0";
      return "true";
    },

    LMSCommit: function (param) {
      if (!isInitialized) {
        lastError = "301";
        return "false";
      }
      onCommit({ ...cmiData });
      lastError = "0";
      return "true";
    },

    LMSGetLastError: function () {
      return lastError;
    },

    LMSGetErrorString: function (errorCode) {
      const errorStrings = {
        "0": "No error",
        "101": "General Exception",
        "201": "Invalid argument",
        "301": "Not initialized",
        "401": "Not implemented error",
      };
      return errorStrings[errorCode] || "Unknown error";
    },

    LMSGetDiagnostic: function (errorCode) {
      return `SCORM 1.2 Diagnostic: Error Code ${errorCode}`;
    },
  };

  return api;
}
