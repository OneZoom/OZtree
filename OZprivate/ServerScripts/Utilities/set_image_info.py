#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This script adds metadata to one or more images, in the format required by e.g.
add_bespoke_images.py. Not all the metadata need be specified
"""
import argparse
import logging
import os
import re
import shutil

from iptcinfo3 import IPTCInfo

logger = logging.getLogger(__name__)   

def set_metadata(filename, args):
    logger.info(f"Changing metadata on {filename}")
    info = IPTCInfo(filename, force=True)
    if args.source_url:
        info["source"] = args.source_url
    if args.licence:
        info["copyright notice"] = args.licence
    if args.rights:
        info["credit"] = args.rights
    info.save_as(filename + "_tmp")
    shutil.move(filename + "_tmp", filename)


def main(args):
    console = logging.StreamHandler()
    if args.verbosity <= 0:
        logger.setLevel(logging.WARN) 
    elif args.verbosity == 1:
        logger.setLevel(logging.INFO) 
    elif args.verbosity == 2:
        logger.setLevel(logging.DEBUG) 

    for filename in args.image_files:
        if os.path.isdir(filename):
            for root, dirs, files in os.walk(filename):
                for name in files:
                    if re.search(r"\.jpe?g$", name, re.IGNORECASE):
                        set_metadata(os.path.join(root, name), args)
        else:
            set_metadata(filename, args)
            

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "image_files",
        nargs='+',
        help=(
            "A list of files. If a file is a jpg, then its metadata will be changed. If "
            "a directory, it will be recursed and jpgs inside will have metadata changed."
        )
    )
    parser.add_argument(
        "--rights",
        "-r",
        help=(
            "The attribution, or person who owns the rights to this image. " +
            "By convention this starts with the copyright sign, e.g. '© Fred Smith'. " +
            "This will be placed in the 'credit' field of the IPTC data"
        )
    )
    parser.add_argument(
        "--licence",
        "-l",
        help=(
            "The licence used, possibly with a url, e.g. " +
            "'CC-BY-SA 2.0 (http://creativecommons.org/licenses/by-sa/2.0/)'. This " +
            "will be placed in the 'copyright notice' field of the IPTC data"
        )
    )
    parser.add_argument(
        "--source_url",
        "-s",
        help=(
            "Some text (usually a URL) pointing to the original version of these " +
            "files. This will be placed in the 'source' field of the IPTC data"
        )
    )
    parser.add_argument('--verbosity', "-v", action="count", default=0, help="Verbosity level")

    main(parser.parse_args())
