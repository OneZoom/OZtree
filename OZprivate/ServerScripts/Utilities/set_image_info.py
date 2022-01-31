#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
This script adds metadata to one or more images, in the format required by e.g.
add_bespoke_images.py. Not all the metadata need be specified
"""
import argparse
import logging
import shutil

from iptcinfo3 import IPTCInfo

logger = logging.getLogger(__name__)   

def main(args):
    console = logging.StreamHandler()
    if args.verbosity <= 0:
        logger.setLevel(logging.WARN) 
    elif args.verbosity == 1:
        logger.setLevel(logging.INFO) 
    elif args.verbosity == 2:
        logger.setLevel(logging.DEBUG) 

    for filename in args.image_files:
        logger.info(f"Changing metadata on {filename}")
        info = IPTCInfo(filename, force=True)
        if args.url:
            info["source"] = args.url.encode()
        if args.licence:
            info["copyright notice"] = args.licence.encode()
        if args.rights:
            info["credit"] = args.rights.encode()
        info.save_as(filename + "_tmp")
        shutil.move(filename + "_tmp", filename)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image_files", nargs='+', help="A list of jpgs")
    parser.add_argument(
        "--url",
        help=(
            "Some text (usually a URL) pointing to the original version of these " +
            "files. This will be placed in the 'source' field of the IPTC data"
        )
    )
    parser.add_argument(
        "--licence",
        help=(
            "The licence used, possibly with a url, e.g. " +
            "'CC-BY-SA 2.0 (http://creativecommons.org/licenses/by-sa/2.0/)'. This " +
            "will be placed in the 'copyright notice' field of the IPTC data"
        )
    )
    parser.add_argument(
        "--rights",
        help=(
            "The attribution, or person who owns the rights to this image. " +
            "By convention this starts with the copyright sign, e.g. '© Fred Smith'. " +
            "This will be placed in the 'credit' field of the IPTC data"
        )
    )
    parser.add_argument('--verbosity', "-v", action="count", default=0, help="Verbosity level")

    main(parser.parse_args())
