@auth.requires_membership(role='manager')
def index():
    mammal_id = None
    for r in db(db.ordered_nodes.ott == 244265).select(db.ordered_nodes.id):
        mammal_id = r.id
    return({'mammal_id':mammal_id, 'mammal_ott':244265})

@auth.requires_membership(role='manager')
def DOCS():
    """
    Uses Flatdoc to render a single compiled markdown file (as returned by COMPILE_DOCS)
    """
    return dict()

@auth.requires_membership(role='manager')
def COMPILED_DOCS():
    """
    return the markdown
    """
    try:
        with open('applications/{}/OZprivate/rawJS/OZTreeModule/docs/_compiled.markdown'.format(request.application), 'rb') as md:
            return dict(markdown=md.read())
    except:
        return dict(markdown="No compiled markdown file found")

@auth.requires_membership(role='manager')
def TEST_POST():
    try:
        ott = int(request.args[0])
    except (ValueError, TypeError):
        ott = 773491
    return dict(ott=ott)

@auth.requires_membership(role='manager')
def TEST_EOL_API():
    try:
        EoL_API_key=myconf.take('api.eol_api_key')
    except:
        EoL_API_key=""
    return dict(EoL_API_key=EoL_API_key)

@auth.requires_membership(role='manager')
def COMMAND_CALL_TEST():
    from subprocess import check_output, STDOUT, CalledProcessError
    import os
    try:
        #a simple test to see if we can call command-line apps (YES!)
        ret_text=check_output([
            'applications/OneZoom/OZprivate/ServerScripts/Utilities/EoLQueryPicsNames.py', '-o',
            'applications/OneZoom/static/FinalOutputs/img', '-ott','435643', '435643', '-eol', '28696158', '27119898', '-v'],
        stderr=STDOUT,
        env={"PATH": "/bin:/usr/bin:/usr/local/bin","PWD":os.getcwd()})
    except CalledProcessError as e:
        ret_text=e.output
    return dict(data=ret_text)

@auth.requires_membership(role='manager')
def GARBAGE_COLLECT():
    import gc
    return({'info':"Garbage collected {} objects".format(gc.collect())})

@auth.requires_membership(role='manager')
def PAUSE_WEB2PY_FOR_PDB():
    #dangerous. Should only run when on localhost - as an additional check we shouldn't create a view
    if request.is_local:
        try:
            import pdb
            import objgraph
            objgraph.show_growth(limit=None, shortnames=False)
            pdb.set_trace()
            return({})
        except Exception as e:
            return {'errors':["{}".format(e), "perhaps you haven't installed pdb or objgraph"]}
    else:
        return {'errors':'not a local request'}

@auth.requires_membership(role='manager')
def OBJGRAPH_DELTAS():
    from collections import OrderedDict
    try:
        import objgraph
        import gc
        import operator
        peak_stats = cache.ram('peak_stats', lambda: {}, time_expire=None)
        last_checked = cache.ram('last_checked', lambda: request.now, time_expire=None)
        gc.collect()
        #cobbled together from https://github.com/mgedmin/objgraph/blob/master/objgraph.py (show_growth())
        stats = objgraph.typestats(shortnames=False)
        deltas = {}
        for name, count in stats.items():
            old_count = peak_stats.get(name, 0)
            if count > old_count:
                deltas[name] = count - old_count
                peak_stats[name] = count
        peak_stats = cache.ram('peak_stats', lambda: peak_stats, time_expire=0)
        cache.ram('last_checked', lambda:  request.now, time_expire=0)
        deltas = sorted(deltas.items(), key=operator.itemgetter(1), reverse=True)
        return({'growth':deltas, 'last_checked': last_checked, 'time_period': "{}".format(request.now -last_checked)})
    except Exception as e:
        return({'error':e})

@auth.requires_membership(role='manager')
def TEST_LINKS():
    labels={770315:'humans', 589951:'medium Galapagos ground finch', 6523:'Galapagos land iguana', 343294: 'seven spot ladybird'}
    leaf_ids = {row.ott:row.id for row in db(db.ordered_leaves.ott.belongs(labels.keys())).select(db.ordered_leaves.id,db.ordered_leaves.ott)}
    return dict(labels=labels, ids=leaf_ids)
    
@auth.requires_membership(role='manager')
def TEST_POPUP():
    """
    Test UIkit popups
    """
    return dict(
    page_info = {},
    version=None,
    tabs=[{'id':'wiki',   'name':T('Wiki'),                 'icon':URL('static','images/W.svg')},
          {'id':'eol',    'name':T('Encyclopedia of Life'), 'icon':URL('static','images/EoL.png')},
          {'id':'iucn',   'name':T('Conservation'),         'icon':URL('static','images/IUCN_Red_List.svg')},
          {'id':'ncbi',   'name':T('Genetics'),             'icon':URL('static','images/DNA_icon.svg')},
          {'id':'powo',   'name':T('Kew')},
          {'id':'ozspons','name':T('Sponsor')}])

@auth.requires_membership(role='manager')
def SAFARI_IFRAME_BUG():
    return dict();
