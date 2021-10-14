#!/usr/bin/env python3

import argparse
import fileinput
import json
import os
import shutil
from subprocess import call

# argparse  -> boolean
# produces true if all parameters are valid. 
# print error message if:
#   -- newick file can't be find            -> can't find newick file: + file path
#   -- completetree file dir not exist     -> Output directory for completetree does not exist: + path
#   -- cut_position_map file dir not exist  -> Output directory for cut_position_map does not exist: + path
def parameter_valid(args):
    parameter_valid = True
    if not os.path.isfile(args.npath):
        print("Can't find newick file: '" + args.npath + "'")
        parameter_valid = False
    if not os.path.exists(args.outdir):
        print("Output directory does not exist: '" + args.outdir +"'")
        parameter_valid = False
    return parameter_valid

# string -> string
# Given newick filepath(string), return a string without comma and semi comma 
# Input: '../../data/output_files/ordered_tree_test.nwk' -> '((,),)'
# Output: '(())'
def tidy_newick(newick_filepath):
    res = ""
    for line in fileinput.input(files=(newick_filepath)):
        res += line.replace(',', '').replace(';', '').replace('\n', '')
    return res


# String -> String
# Given tidied newick string, return rawData and metadata in completetree.js 
# Input: (()) 
# Output:var rawData = '(())' + 'var metadata= {....}';
def generate_rawdata_metadata(newick_str):
    rawData = "var rawData = '" + newick_str +"';"
    metadata = 'var metadata = {\n"leaf_meta":{\n"0":["OTTid","scientificName","common_en","popularity","picID","picID_credit","picID_rating","picID_src","IUCN","price","sponsor_kind","sponsor_name","sponsor_extra","sponsor_url","n_spp"],\n"temp":[null," "]},\n\n"node_meta":{\n"0":["OTTid","scientificName","common_en","popularity","picID","picID_credit","picID_rating","IUCN","price","sponsor_kind","sponsor_name","sponsor_extra","sponsor_url","lengthbr","sp1","sp2","sp3","sp4","sp5","sp6","sp7","sp8","iucnNE","iucnDD","iucnLC","iucnNT","iucnVU","iucnEN","iucnCR","iucnEW","iucnEX"],\n"temp":[]}};'
    return rawData + "\n" + metadata

# String, Number -> String
# Given tidied newick(polytomy) string, return stringified cut position map for binary tree and polytomy tree
def generate_cut_position_map(newick_str, threshold):
  binary_cut_map = generate_binary_cut_position_map(newick_str, threshold)
  polytomy_cut_map = generate_polytomy_cut_position_map(newick_str, threshold)
  cut_threshold = "var cut_threshold = " + str(threshold) + ";"
  return binary_cut_map + "\n\n" + polytomy_cut_map + "\n\n" + cut_threshold;
  

# String, Number -> String
# Given tidied newick string, return stringified cut_position_map object.
# Output example: '{"4203700":1302201,"4203701":685684,"4203702":685609,"4203703":683568,"4203704":7901,"4203705":7900,"4203706":6417,"4203707":6396}'
def generate_binary_cut_position_map(newick_str, threshold):  
  count_arr = [None] * len(newick_str)
  count = 0
  for index, c in enumerate(reversed(newick_str)):
      index = len(newick_str) - index - 1
      if c == '(' or c == '{':
          count = count-1
      elif c == ')' or c == '}':
          count = count + 1
      else:
          raise ValueError("newick str contains non bracket character: " + c)
      count_arr[index] = count

  start_end_arr = [0, len(count_arr)-1]
  cut_position_map = {}
  while len(start_end_arr) > 0:
      start = start_end_arr.pop(0)
      end = start_end_arr.pop(0)
      build_cut_position_map(start, end, start_end_arr, count_arr, cut_position_map, threshold)
  cut_position_map = json.dumps(cut_position_map)
  cut_position_map = "var cut_position_map_json_str = '" + cut_position_map +"';"
  return cut_position_map

# String, Number -> String
# Given tidied newick(polytomy) string, return stringified cut_position_map object.
# Output example: '{"4203700":{685684, 79999, 1302201, 4203701},"4203702":{685609, 4203703}, "4203704": {7901,4203705,7900,4203706}}'
# The key of the output json string is the end position of a string in the newick_str.
# The value is an array: [start_sub1, end_sub1, start_sub2, end_sub2, ..., start_subN, end_subN]. start_subN means the start position of 
# its nth child, end_subN is the end position of its nth child.
def generate_polytomy_cut_position_map(newick_str, threshold):
    start_end_arr = [0, len(newick_str) - 1]
    cut_position_map = {}
    while len(start_end_arr) > 0:
        start = start_end_arr.pop(0)
        end = start_end_arr.pop(0)
        cut_position_map[end] = get_polytomy_substring_pos(start, end, start_end_arr, threshold, newick_str)
    cut_position_map = json.dumps(cut_position_map)
    cut_position_map = "var polytomy_cut_position_map_json_str = '" + cut_position_map + "';"
    return cut_position_map

# Number, Number, Array, Array, Map, Number
# start, end represent indices of a node A on rawData. 
# this function finds cut position of node A on rawData, then store it in cut_position_map and put its children start and end position in start_end_arr
def build_cut_position_map(start, end, start_end_arr, count_arr, cut_position_map, threshold):
    endValue = count_arr[end];
    for index in reversed(range(start, end)):
        if count_arr[index] == endValue:
            cut_position_map[end] = index-1
            if (index-start-2) >= threshold:
                start_end_arr.append(start+1)
                start_end_arr.append(index-1)
            if (end-index-1) >= threshold:
                start_end_arr.append(index)
                start_end_arr.append(end-1)
            break

#This function finds substring start and end position given a string representing polytomy tree.
#Substring's start and end position would be pushed into start_end_arr if its distance is larger than threshold.
def get_polytomy_substring_pos(start, end, start_end_arr, threshold, newick_str, called_by_self = False):
    res = []
    if (end <= start or (called_by_self and newick_str[end] == ')')):
        res = res + [start, end]
        if ((end - start) > threshold):
            start_end_arr.append(start)
            start_end_arr.append(end)
        return res
        
    cut_point = None
    bracket_count = 0
    for index in reversed(range(start, end+1)):
        c = newick_str[index]
        if c == ')' or c == '}':
            bracket_count = bracket_count + 1
        elif c == '(' or c == '{':
            bracket_count = bracket_count - 1
            if (bracket_count == 1):
                cut_point = index - 1
                break
    if (cut_point is not None):
        res = res + get_polytomy_substring_pos(start+1, cut_point, start_end_arr, threshold, newick_str, True)
        res = res + get_polytomy_substring_pos(cut_point+1, end-1, start_end_arr, threshold, newick_str, True)
    else:
        res = res + [start, start, end, end]
    return res
#rawData string + metadata -> output result into file.

#produce cut_position_map.js and completetree.js given newick tree.
parser = argparse.ArgumentParser(
    description="Generate rawData, metadata and cut_position_map given newick string", 
    formatter_class=argparse.ArgumentDefaultsHelpFormatter)

#pick the most recent ordered_tree_XXX.nwk file
import glob
import re

datafile_name = "ordered_{data}_{version}.{ext}"
input_file = glob.glob(os.path.join(os.path.dirname(__file__),'..','..','data','output_files', 
    datafile_name.format(data='tree', version='*', ext="poly")))
parser.add_argument(
    '--npath', 
    default=input_file,
    nargs = '+',
    help='filepath of polytomy-marked newick string')

parser.add_argument(
    '--outdir','-o', 
    default= os.path.join(os.path.dirname(__file__),'..','..','..','static','FinalOutputs', 'data'), 
    help='output filepath of cut_position_map')

parser.add_argument(
    '--treefilename', 
    default='completetree_{version}.js', 
    help='output filepath of rawData and metadata')
    
parser.add_argument(
    '--cutfilename', 
    default= 'cut_position_map_{version}.js', 
    help='output filepath of cut_position_map')

parser.add_argument(
    '--datefilename', 
    default= 'dates_{version}.js', 
    help='output filepath of json dates file (copied from {} in the same dir as the treefile)'.format(
        datafile_name.format(data='dates', version='XXXXX', ext='js')))
    
parser.add_argument(
    '--threshold', 
    default=10000, 
    type=int, 
    help='Threshold for deciding if a node and its descendants needs to be recorded in cut_position_map')

args = parser.parse_args()
#tidy up the file names to include versioning numbers
args.npath = max(args.npath, key=os.path.getctime)
version_number = re.search(datafile_name.format(data='tree', version="([^/]+)", ext="(nwk|poly)"), args.npath).group(1)
print("Using version number: {}".format(version_number))
treefile_path = os.path.join(args.outdir, args.treefilename.format(version=version_number))
cutfile_path  = os.path.join(args.outdir, args.cutfilename.format(version=version_number))
datefile_inpath  = os.path.join(os.path.dirname(args.npath), datafile_name.format(data='dates', version=version_number, ext='js'))
datefile_outpath = os.path.join(args.outdir, args.datefilename.format(version=version_number))
if parameter_valid(args):
    newick_str = tidy_newick(args.npath)
    treedata_str = generate_rawdata_metadata(newick_str)
    cutmap_str = generate_cut_position_map(newick_str, args.threshold)
    with open(treefile_path, 'wt') as tree:
        tree.write(treedata_str)
    print("Generated file: " + treefile_path)
    call(['gzip', '-9fk', treefile_path])
    print("Gzipped tree file")
    with open(cutfile_path, 'wt') as cutfile:
        cutfile.write(cutmap_str)
    print("Generated file: " + cutfile_path)
    call(['gzip', '-9fk', cutfile_path])
    print("Gzipped cutmap file")
    print("Copying date file {} to {}".format(datefile_inpath, datefile_outpath))
    shutil.copyfile(datefile_inpath, datefile_outpath)
    call(['gzip', '-9fk', datefile_outpath])
    print("Gzipped date file")
    print("Done")
