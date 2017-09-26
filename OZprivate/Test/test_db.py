#!/usr/bin/env python3

from sqlite3 import dbapi2 as sqlite
from prune_trees_from_dict import get_taxa_include_dict_from_db

def get_taxa_include_dict_from_db2(db_connection):
    '''returns a set of species to include in the trees, by querying a db'''
    try:
        db_curs = db_connection.cursor()
        db_curs.execute("SELECT OTT_ID, name from reservations where verified_time is not NULL and (deactivated is NULL or deactivated = '') and OTT_ID NOT IN (SELECT OTT_ID from leaves_in_unsponsored_tree)")
        arr = db_curs.fetchall()
        return {"{}_ott{}".format(k[1].replace (" ", "_"), k[0]):0 for k in arr}
    except:
        warn('problem with db')
        return({})



db_connection = sqlite.connect('../../databases/storage.sqlite')
print(get_taxa_include_dict_from_db2(db_connection))