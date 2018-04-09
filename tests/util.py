import os.path
import re
import subprocess

web2py_app_dir = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))
appconfig_loc = os.path.join(web2py_app_dir, 'private', 'appconfig.ini')
ip = "127.0.0.1"
port = "8001"
base_url="http://"+ip+":"+port+"/"
humanOTT = 770315

def get_db_connection():
    database_string = None
    with open(appconfig_loc, 'r') as conf:
        conf_type=None
        for line in conf:
        #look for [db] line, followed by uri
            m = re.match(r'\[([^]]+)\]', line)
            if m:
                conf_type = m.group(1)
            if conf_type == 'db':
                m = re.match('uri\s*=\s*(\S+)', line)
                if m:
                    database_string = m.group(1)
    assert database_string is not None, "Can't find a database string to connect to"
    db = {}
    if database_string.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db['connection'] = sqlite.connect(os.path.join(web2py_app_dir,'databases', database_string[len('sqlite://'):]))
        db['subs'] = "?"
        
    elif database_string.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', database_string.strip())
        if match.group(2) == '':
            #enter password on the command line, if not given (more secure)
            from getpass import getpass
            pw = getpass("Enter the sql database password: ")
        else:
            pw = match.group(2)
        db['connection'] = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
        db['subs'] = "%s"
    else:
        fail("No recognized database specified: {}".format(database_string))
    return(db)

def appconfig_contains(start_of_line, section="general"):
    curr_section = None
    start_of_line = start_of_line.strip().replace(" ","")
    with open(appconfig_loc, "r") as f:
        for line in f:
            m = re.match(r"\[(.+?)\]", line)
            if m:
                curr_section = m.group(1)
            else:
                line = line.strip().replace(" ","")
                if section==curr_section and line.startswith(start_of_line):
                    return True
    return False

def web2py_server(appconfig_file=None):
    cmd = ['python2', os.path.join(web2py_app_dir, '..','..','web2py.py'), '-Q', '-i', ip, '-p', port, '-a', 'pass']
    if appconfig_file is not None:
        cmd += ['--args', appconfig_file]
    return subprocess.Popen(cmd)
