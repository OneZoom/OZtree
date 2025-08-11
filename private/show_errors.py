"""
Print any web2py application errors to the console
==================================================

Read web2py error files & print them to the console in a human-readable fashion.

Usage::

    grunt exec:show_errors[:clear]

* ``clear`` will delete errors after outputting errors, so subsequent calls only show new errors

"""
import glob
import os
import os.path
import pickle
import sys

run_clear = 'clear' in sys.argv

application_path = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))

# Manually append web2py to module search path, so we don't have to run underneath it
try:
    import gluon
except ImportError:
    sys.path.append(os.path.realpath(os.path.join(application_path, "..", "..")))

for err_path in sorted(glob.glob(os.path.join(application_path, "errors", "*.*.*.*.*-*-*.*"))):
    err_name = os.path.basename(err_path)
    with open(err_path, 'rb') as f:
        err = pickle.load(f)

    print(err_name)
    print("=" * len(err_name))
    print(err['layer'])
    print(err['output'])
    print(err['traceback'])

    if run_clear:
        os.unlink(err_path)
