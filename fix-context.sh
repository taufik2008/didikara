#!/bin/bash
# Run this if AppContext errors appear: bash fix-context.sh
python3 -c "
import re
content = open('src/context/AppContext.js').read()
cut = content.rfind('  return (')
if cut == -1:
    print('ERROR: cannot find return( in AppContext.js')
    exit(1)
base = content[:cut]
closing = '''  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = require(\"react\").useContext(AppContext);
  if (!ctx) throw new Error(\"useApp must be used within AppProvider\");
  return ctx;
}
'''
# Use correct import
closing = closing.replace('require(\"react\").useContext', 'useContext')
open('src/context/AppContext.js','w').write(base+closing)
print('AppContext.js repaired OK')
"
