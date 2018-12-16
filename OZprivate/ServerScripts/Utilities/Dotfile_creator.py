#!/usr/bin/env python3 -u
"""
Convert the order_leaves and ordered_nodes tables into .dot format:

something like this

root 1  2
2   3  4

to indicate (‘1’,(‘3’,’4')’2’).
"""
import os
import sys
import argparse
import re

import pandas as pd
import numpy as np

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''

def node_print(id):
    """If id < 0, this is a leaf node and should be printed with an 'L' not a '-'"""
    return ("L"+str(-id)) if id<0 else str(id)

def main():
    default_appconfig_file = "../../../private/appconfig.ini"
    random_seed_addition = 1234
    parser = argparse.ArgumentParser(description='Generate a .dot file from ordered_nodes and ordered_leaves')
    parser.add_argument('--dotfile_prefix', '-d', type=str,
        default="OneZoomTree", help='The prefix of the dot file (will have {version}.dot appended)')
    parser.add_argument('--nodefile_prefix', '-f', type=str,
        default="OneZoomNodes", help='The prefix of the file specifying which internal nodes are real or false (fake) injected to break polytomies, and the number of tips under each (will have {version}.nodes appended)')
    parser.add_argument('--agefile_prefix', '-a', type=str,
        default="OneZoomAge", help='The prefix of the file specifying which ages for each node (will have {version}.nodes appended)')
    parser.add_argument('--namefile_prefix', '-n', type=str,
        default="OneZoomNames", help='The prefix of the file specifying names for each node (will have {version}.nodes appended)')
    parser.add_argument('--idfile_prefix', '-i', type=str,
        default="OneZoomDBids", help='The prefix of the file specifying NCBI & OTT numbers for each node (will have {version}.nodes appended)')
    parser.add_argument('--extinction_risk_file_prefix', '-e', type=str,
        default="OneZoomIUCN", help='The prefix of the file specifying endangerment status for each node (will have {version}.nodes appended)')
    parser.add_argument('--database', '-db', default=None, help='name of the db containing eol ids, in the same format as in web2py, e.g. sqlite://../databases/storage.sqlite or mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>. If not given, the script looks for the variable db.uri in the file {} (relative to the script location)'.format(default_appconfig_file))
    args = parser.parse_args()
        

    if args.database is None:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), default_appconfig_file)) as conf:
            conf_type=None
            for line in conf:
            #look for [db] line, followed by uri
                m = re.match(r'\[([^]]+)\]', line)
                if m:
                    conf_type = m.group(1)
                if conf_type == 'db' and args.database is None:
                    m = re.match('uri\s*=\s*(\S+)', line)
                    if m:
                        args.database = m.group(1)

    if args.database.startswith("sqlite://"):
        from sqlite3 import dbapi2 as sqlite
        db_connection = sqlite.connect(os.path.relpath(args.database[len("sqlite://"):], args.treedir))
        
    elif args.database.startswith("mysql://"): #mysql://<mysql_user>:<mysql_password>@localhost/<mysql_database>
        import pymysql
        match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/([^?]*)', args.database.strip())
        if match.group(2) == '':
            #enter password on the command line, if not given (more secure)
            if args.script:
                pw = input("pw: ")
            else:
                from getpass import getpass
                pw = getpass("Enter the sql database password: ")
        else:
            pw = match.group(2)
        db_connection = pymysql.connect(user=match.group(1), passwd=pw, host=match.group(3), db=match.group(4), port=3306, charset='utf8mb4')
    else:
        warn("No recognized database specified: {}".format(args.database))
        sys.exit()

    print("Reading ordered_leaves and ordered_nodes from database...", end="", flush=True)
    df = pd.read_sql("SELECT id, parent, real_parent, age, name, ott, ncbi from ordered_nodes "
        "UNION" " SELECT -id AS id, parent, real_parent, extinction_date AS age, name, ott, ncbi from ordered_leaves", db_connection)
    internal_nodes = pd.read_sql("SELECT id, real_parent, leaf_rgt, leaf_lft from ordered_nodes", db_connection)
    iucn = pd.read_sql("select -ordered_leaves.id as id, iucn.status_code as status_code from ordered_leaves left join iucn ON ordered_leaves.ott = iucn.ott order by ordered_leaves.id", db_connection)
    print(" read")
    version = None
    #make a dataframe of booleans (is real_parent >= 0) indexed by ID
    is_root = df.parent < 0
    assert np.sum(is_root) == 1
    version = -df.loc[is_root,'parent'].values[0]
    with open(args.dotfile_prefix + str(version) + ".dot", "wt") as dotfile, \
        open(args.nodefile_prefix + str(version) + ".nodes", "wt") as nodefile, \
        open(args.agefile_prefix + str(version) + ".nodes", "wt") as agefile, \
        open(args.namefile_prefix + str(version) + ".nodes", "wt") as namefile, \
        open(args.idfile_prefix + str(version) + ".nodes", "wt") as idfile, \
        open(args.extinction_risk_file_prefix + str(version) + ".nodes", "wt") as iucnfile:
        print("Writing files to {}".format(
            [dotfile.name, nodefile.name, agefile.name, namefile.name, idfile.name, iucnfile.name]))
        for internal_node_label, group in df[~is_root].groupby('parent'):
            assert len(group.index) == 2
            print(internal_node_label, node_print(group.id.values[0]), node_print(group.id.values[1]),
                sep="\t", file=dotfile)
        for idx, row in internal_nodes.iterrows():
            print(row.id, "T" if row.real_parent >= 0 else "F", row.leaf_rgt - row.leaf_lft, sep="\t", file=nodefile)
        for idx, row in df.iterrows():
            print(node_print(row.id), "" if np.isnan(row.age) else row.age, sep="\t", file=agefile)
            print(node_print(row.id), row['name'] or "", sep="\t", file=namefile)
            print(node_print(row.id), "" if np.isnan(row.ott) else int(row.ott), "" if np.isnan(row.ncbi) else int(row.ncbi), sep="\t", file=idfile)
        for idx, row in iucn.iterrows():
            print(node_print(row.id), row.status_code or "", sep="\t", file=iucnfile)
if __name__ == "__main__":
    main()