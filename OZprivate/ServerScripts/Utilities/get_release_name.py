import argparse
import json
import urllib.request
import urllib.error

base_url = "https://api.github.com/repos/OneZoom/OZtree/releases/tags/"

parser = argparse.ArgumentParser(description=(
    "Use the GitHub API to print the release name (if any) of a OneZoom tagged version"))
parser.add_argument("tag_name_file", type=argparse.FileType('r'))

args = parser.parse_args()
tag_name = args.tag_name_file.readline().strip()

try:
    with urllib.request.urlopen(f'{base_url}{tag_name}') as response:
       info = json.loads(response.read())
       print(info.get('name', '').strip())
       # Hack around Zulu time
       print(info.get('published_at', '').strip().replace("Z", "+00:00"))
except urllib.error.HTTPError:
    pass