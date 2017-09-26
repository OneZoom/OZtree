#!/usr/bin/env python3
"""
Take a csv file and reorder the field a bit. Useful when we change the metadata fields
"""
import argparse
import csv
class GrowingList(list):
    def __setitem__(self, index, value):
        if index >= len(self):
            self.extend([None]*(index + 1 - len(self)))
        list.__setitem__(self, index, value)
        
        
parser = argparse.ArgumentParser(description='Take a csv file and reorder the field a bit. Useful when we change the metadata fields. Save the results in another folder')
parser.add_argument('save_folder', default='tmp', help='The folder in which to save the converted files')
parser.add_argument('csvfiles', type=argparse.FileType('r', encoding='UTF-8'), nargs='+', help='A list of csv files to convert')
args = parser.parse_args()

#mapping of old columns to new columns
colmap ={0:0, #sciname ==0
         1:1, #OTT=1
         2:4 #common-name now ==4 - 2 & 3 are unpopulated (
         

for csvfile in args.csvfiles:
    with open(os.path.join(args.save_folder, os.path.basename(csvfile.name)), 'w', encoding='UTF-8') as outfile:
        with csvfile as csvin:
        reader = csv.reader(csvin)
        csvout = csv.writer(outfile, quoting=csv.QUOTE_MINIMAL)
    
        for row in reader:
            newrow= GrowingList()
            for i,dat in enumerate(row)
                newrow[colmap[i]]=dat
            csvout.writerow(newrow)
