import re
import os.path

from gluon import current
from gluon.contrib.markdown.markdown2 import markdown_path

def render_docs(doc_filename):
    request = current.request
    if '/' in doc_filename:
        raise ValueError("doc_filename should not leave current path: '%s'" % doc_filename)

    # Turn requested .md into HTML
    out = markdown_path(os.path.join(request.folder, 'docs', doc_filename))

    # Replace instances of onezoom.org with the current host origin, so we stay on the current host
    current_origin = '%s://%s/' % (request.env.wsgi_url_scheme, request.env.http_host)
    out = re.sub(r'https?://(www\.)?onezoom.org/', current_origin, out)
    return out
