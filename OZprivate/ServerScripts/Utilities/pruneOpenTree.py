#!/usr/bin/env python3
"""
Prune all but a set of specific open tree identifiers from a whole tree file. Open Tree identifiers can refer to tips or internal nodes. Requires dendropy 4
"""
import sys
import gzip

from dendropy import Tree

__author__ = "Yan Wong"
__license__ = '''This is free and unencumbered software released into the public domain by the author, Yan Wong, for OneZoom CIO.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>'''

def node_label_in(node, OTTs_to_keep):
    if node.label is None:
        return False
    else:
        ott = node.label.rsplit(" ",1)[-1]
        return ott.startswith('ott') and int(ott[3:]) in OTTs_to_keep


def main(OT_filehandle, OTTs_to_keep, outfile):
    #read in tree, but don't create taxa (faster)\
    tree = Tree.get(stream=OT_filehandle, schema="newick", suppress_leaf_node_taxa=True)
    for node in tree.postorder_node_iter():
        if hasattr(node, 'keep') or node_label_in(node, OTTs_to_keep):
            if node.parent_node: #this is not the root
                node.parent_node.keep=True
        else:
            if not hasattr(node, 'keep'):
                node.parent_node.remove_child(node, suppress_unifurcations=False)
    tree.write(file=outfile, schema='newick', suppress_leaf_node_labels=False) 

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "OpenTree_file", type=argparse.FileType('r'), help="The full tree in newick form")
    parser.add_argument(
        "OTTs_to_keep", type=argparse.FileType('r'), nargs='?', default=sys.stdin, help="File of otts")
    parser.add_argument(
        "outfile", type=argparse.FileType('w'), nargs='?', default=sys.stdout, help="The output tree")
    args = parser.parse_args()
    otts = set()
    for line in args.OTTs_to_keep:
        otts.update([int(ott) for ott in line.split()])
    main(args.OpenTree_file, otts, args.outfile)