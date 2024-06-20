import configparser
import logging
import os
import re
import sys


logger = logging.getLogger(__name__)

def connect_to_database(database, treedir, script):
    if database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(database[len("sqlite://"):], treedir))
        datetime_now = "datetime('now')";
        subs="?"
        
    elif database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', database.strip())
        if match.group(2) == '':
            #enter password on the command line, if not given (more secure)
            if script:
                pw = input("pw: ")
            else:
                from getpass import getpass
                pw = getpass("Enter the sql database password: ")
        else:
            pw = match.group(2)
        db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
        datetime_now = "NOW()"
        subs="%s"
    else:
        logger.error("No recognized database specified: {}".format(database))
        sys.exit()
    
    return db_connection, datetime_now, subs

def read_config(config_file):
    """
    Read the passed-in configuration file, defaulting to the standard appconfig.ini
    """

    if config_file is None:
        config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../private/appconfig.ini")

    config = configparser.ConfigParser()

    config.read(config_file)
    return config
