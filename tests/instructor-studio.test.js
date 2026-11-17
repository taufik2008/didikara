import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PAGE_PERMISSION, DEFAULT_PERMISSIONS, canAccessPage, PERMISSIONS } from "../src/lib/permissions.js";

test("Instructor Studio permissions and navigation mapping", () => {
  // 1. Instructor page permission is registered
  assert.equal(PAGE_PERMISSION["instructor-page"], PERMISSIONS.ACCESS_LMS);

  // 2. Instructor role has ACCESS_LMS
  assert.ok(DEFAULT_PERMISSIONS.instructor.includes(PERMISSIONS.ACCESS_LMS));

  // 3. canAccessPage allows instructor
  const instructorUser = { email: "instruktur@didikara.com", role: "instructor", fullname: "Budi Instruktur" };
  assert.equal(canAccessPage(instructorUser, "instructor-page"), true);

  // 4. Student cannot access admin-page
  const studentUser = { email: "siswa@didikara.com", role: "student", fullname: "Siswa Belajar" };
  assert.equal(canAccessPage(studentUser, "admin-page"), false);
});

test("Instructor Studio components and routes exist", () => {
  const componentPath = path.resolve("./src/components/Instructor/InstructorStudioPage.js");
  const routePath = path.resolve("./src/app/(app)/instructor/page.js");

  assert.ok(fs.existsSync(componentPath), "InstructorStudioPage.js must exist");
  assert.ok(fs.existsSync(routePath), "Route /instructor/page.js must exist");

  const componentContent = fs.readFileSync(componentPath, "utf8");
  assert.ok(componentContent.includes("handleOpenLmsManageModal"), "Studio must wire handleOpenLmsManageModal");
  assert.ok(componentContent.includes("handleOpenCrudModal"), "Studio must wire handleOpenCrudModal");
  assert.ok(componentContent.includes("Manajemen Kursus"), "Studio must display Manajemen Kursus heading");
});

test("Sidebar differentiates menus for instructor role", () => {
  const sidebarPath = path.resolve("./src/components/Sidebar.js");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf8");

  assert.ok(sidebarContent.includes("isInstructorRole"), "Sidebar must detect instructor role");
  assert.ok(sidebarContent.includes("Manajemen Kursus"), "Sidebar must include Manajemen Kursus menu");
  assert.ok(sidebarContent.includes("instructor-page"), "Sidebar must navigate to instructor-page");
});

test("Backend API db route allows instructor course saves", () => {
  const dbRoutePath = path.resolve("./src/app/api/db/route.js");
  const dbContent = fs.readFileSync(dbRoutePath, "utf8");

  assert.ok(dbContent.includes("isInstructorCourseSave"), "DB route must define isInstructorCourseSave");
  assert.ok(dbContent.includes("canManageCourse"), "DB route must verify instructor ownership via canManageCourse");
  assert.ok(dbContent.includes("course_instructors"), "DB route must auto-assign instructor in course_instructors");
});

test("Sidebar and AuthContext handle image URL avatar and safe logout", () => {
  const sidebarPath = path.resolve("./src/components/Sidebar.js");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf8");

  // Avatar safely handles URLs with <img>
  assert.ok(sidebarContent.includes("currentUser.avatar.startsWith"), "Sidebar must detect image URL avatars");
  assert.ok(sidebarContent.includes("<img"), "Sidebar must render img tag for URL avatars");
  assert.ok(sidebarContent.includes("handleLogout()"), "Sidebar must call handleLogout without passing event");

  // AuthContext safe function check
  const authContextPath = path.resolve("./src/context/AuthContext.js");
  const authContent = fs.readFileSync(authContextPath, "utf8");
  assert.ok(authContent.includes('typeof onLogout === "function"'), "AuthContext must verify onLogout is function");
});
