#!/usr/bin/env python
# coding: utf-8

# In[502]:


import numpy as np
import pandas as pd
import datetime
from tqdm import tqdm_notebook


# In[503]:


version = "25589581"
dotdata = pd.read_csv("OneZoomTree{}.dot".format(version), sep='\t', index_col=0, header=None, names=["id","c1","c2"])
metadata = pd.read_csv("OneZoomNodes{}.nodes".format(version), sep='\t', index_col=0, header=None, names=["id", "real_node", "ntips"])
namedata = pd.read_csv("OneZoomNames{}.nodes".format(version), sep='\t', index_col=0, header=None, keep_default_na=False, names=["id", "name"])
namedata = namedata[~pd.to_numeric(namedata.index, "coerce").isnull()] #remove leaves from name data
namedata.index = namedata.index.astype(np.int)


# In[504]:


len(dotdata), len(metadata), len(namedata)


# In[505]:


#add the real_node and ntips information
df = dotdata.join(metadata)
df = df.join(namedata[~pd.to_numeric(namedata.index, "coerce").isnull()])
df['parent'] = -1
df['cut_score'] = 0
df['chunk'] = 0


# In[506]:


mapping = pd.DataFrame.from_dict({
    "child":pd.to_numeric(np.concatenate([df.c1.values,df.c2.values]), "coerce"),
    "parent":np.concatenate([df.index,df.index])})
mapping = mapping[~pd.isna(mapping.child)]
mapping['child'] = mapping.child.values.astype(np.int)


# In[507]:


df.loc[mapping.child,'parent'] = mapping.parent.values
df.parent = df.parent.astype(int)
assert sum(df.parent == -1)==1 #check there is only one root


# In[508]:


def recalc_tips_and_scores(idx):
    n_removed = df.loc[idx].ntips
    while idx >=0:
        df.loc[idx,'ntips'] -= (n_removed - 1) # Subtract one to account for the current node turning into a leaf
        df.loc[idx,'cut_score'] = make_score(df.loc[[idx]]).values[0]
        idx = df.loc[idx,'parent']
    return n_removed

# A stack-based alternative to recursive tree traversal.
def children(idx):
    stack = [idx]
    while stack:
        node = stack.pop()
        yield node
        for child in reversed(df.loc[node,['c1','c2']]):
            #only descend into children if we haven't chunked them already
            if df.loc[node,'chunk']==0:
                try:
                    stack.append(int(child))
                except ValueError:
                    pass

def make_score(rows):
    target_chunksize, min_chunksize, max_chunksize = 1000, 500, 2000
    return ((rows.ntips >= min_chunksize) & (rows.ntips <= max_chunksize)) * (        1/((rows.ntips - target_chunksize) ** 2 + 1) +         np.where(rows.name, 2, 0))


# In[509]:


df.cut_score = make_score(df)
print(df.cut_score.idxmax())
df.sort_values("cut_score", ascending=False)


# In[510]:


df.chunk = 0
chunk = 1

with open("OneZoomChoppedTree{}.dot".format(version), "wt") as msgfile:
    def log(msg, endchar=" "):
        print(msg, end=endchar, flush=True)
        print(msg, end=endchar, file=msgfile)

    start = datetime.datetime.now()
    while (np.any(df.chunk == 0)):
        tm = datetime.datetime.now()
        best = df.cut_score.idxmax()
        log("Cutting on node {}{}:".format(best, ((" ("+str(df.loc[best,'name'])+")") if df.loc[best,'name'] else "")))
        n_in_chunk = recalc_tips_and_scores(best)
        log("{} leaves".format(n_in_chunk))
        descendants = np.array([x for x in children(best)], dtype=np.int)
        assert len(descendants) == n_in_chunk, "{} not {}".format(len(descendants), n_in_chunk)
        assert df.loc[best,'ntips'] == 1
        df.loc[best,'ntips'] == 0 # The cut off node is now a leaf - has no descendant leaves
        df.loc[descendants,'chunk'] = chunk
        df.loc[descendants,'cut_score'] = np.NaN # Make sure we never pick nodes that are in a chunk
        left = sum(df.chunk == 0)
        log("allocated to chunk {} in {} seconds: {} left ({:.2f}%)".format(
            chunk,
            (datetime.datetime.now()-tm).total_seconds(),
            left,
            left/len(df)*100), "\n")
        chunk += 1
    log("Finished in {} minutes".format((datetime.datetime.now()-tm).total_seconds()/60))


# In[511]:


df


# In[513]:


df.to_csv("OneZoomChoppedTree{}.dot".format(version), sep='\t', columns=['c1','c2','chunk'], header=False)


# In[516]:


get_ipython().run_line_magic('matplotlib', 'inline')
df.chunk.value_counts().hist()


# In[ ]:




