## Details of tree construction

This directory contains the data used to construct the OneZoom "AllLife" tree of all known species of life on earth. The only project that remotely attempts to provide suitable data for use in this effort is the [Open Tree of Life](https://tree.opentreeoflife.org). However, the current 'synthetic tree' available from the OpenTree project has many polytomies and is not up-to-date in some areas. It also lacks date estimates.

For this reason, in the OneZoom tree, some specific regions, mainly on the lineage leading to humans, have been replaced to make the standard tree as displayed at [www.onezoom.org](http://www.onezoom.org). The individual files in the `BespokeTree/include_noAutoOTT` directory contain the hand-crafted files used as a basis for this default OneZoom tree. These are combined using the directives specified in `AdditionalFiles/base_tree.js`.

## References

Headers within each individual `.phy` or `.PHY` file in the `BespokeTree/include_noAutoOTT` directory give academic references for the phylogenies and dates for common ancestors used in that file, as well as explanations for how they have been pieced together. Note that the dates on several trees tree have been recalibrated using [PATHd8](http://www2.math.su.se/PATHd8/) so that they fit with the estimated 'concestor dates' as described in the Ancestor’s Tale, 2nd ed.

The full list of academic references used in these files, as permanent DOI links or personal communication notes, is provided below for convenience (see [individual files](BespokeTree/include_noAutoOTT) for details)

<!-- Note that the text below was obtained by

perl -ne 'print "* [$1]($1)\n" if m|(https://doi[^\s\)\]]+)|g' include_noAutoOTT/* | sort | uniq
perl -ne 'print "* $1\n" if m|(pers.\s+comm.\s+\S+\s+\S+)|g' include_noAutoOTT/*

 -->
 
* [https://doi.org/10.1006/mpev.2001.1036](https://doi.org/10.1006/mpev.2001.1036)
* [https://doi.org/10.1007/978-94-017-9306-3_2](https://doi.org/10.1007/978-94-017-9306-3_2)
* [https://doi.org/10.1007/s00227-010-1492-7](https://doi.org/10.1007/s00227-010-1492-7)
* [https://doi.org/10.1007/s13127-015-0261-3](https://doi.org/10.1007/s13127-015-0261-3)
* [https://doi.org/10.1007/s13225-018-0401-0](https://doi.org/10.1007/s13225-018-0401-0)
* [https://doi.org/10.1016/j.cub.2008.09.005](https://doi.org/10.1016/j.cub.2008.09.005)
* [https://doi.org/10.1016/j.cub.2009.07.004](https://doi.org/10.1016/j.cub.2009.07.004)
* [https://doi.org/10.1016/j.cub.2015.06.068](https://doi.org/10.1016/j.cub.2015.06.068)
* [https://doi.org/10.1016/j.cub.2019.01.068](https://doi.org/10.1016/j.cub.2019.01.068)
* [https://doi.org/10.1016/j.tree.2019.08.008](https://doi.org/10.1016/j.tree.2019.08.008)
* [https://doi.org/10.1016/j.ympev.2011.08.028](https://doi.org/10.1016/j.ympev.2011.08.028)
* [https://doi.org/10.1016/j.ympev.2011.12.012](https://doi.org/10.1016/j.ympev.2011.12.012)
* [https://doi.org/10.1016/j.ympev.2012.02.033](https://doi.org/10.1016/j.ympev.2012.02.033)
* [https://doi.org/10.1016/j.ympev.2015.10.009](https://doi.org/10.1016/j.ympev.2015.10.009)
* [https://doi.org/10.1038/nature05634](https://doi.org/10.1038/nature05634)
* [https://doi.org/10.1038/nature13679](https://doi.org/10.1038/nature13679)
* [https://doi.org/10.1038/nature14181](https://doi.org/10.1038/nature14181)
* [https://doi.org/10.1038/nature16520](https://doi.org/10.1038/nature16520)
* [https://doi.org/10.1038/nature16545](https://doi.org/10.1038/nature16545)
* [https://doi.org/10.1038/s41467-021-22044-z](https://doi.org/10.1038/s41467-021-22044-z)
* [https://doi.org/10.1038/s41559-017-0331-3](https://doi.org/10.1038/s41559-017-0331-3)
* [https://doi.org/10.1038/s41559-018-0644-x](https://doi.org/10.1038/s41559-018-0644-x)
* [https://doi.org/10.1038/s41586-018-0708-8,](https://doi.org/10.1038/s41586-018-0708-8,)
* [https://doi.org/10.1038/s41586-018-0708-8](https://doi.org/10.1038/s41586-018-0708-8)
* [https://doi.org/10.1073/pnas.1105499108](https://doi.org/10.1073/pnas.1105499108)
* [https://doi.org/10.1080/14772000.2010.484436](https://doi.org/10.1080/14772000.2010.484436)
* [https://doi.org/10.1093/gbe/evu031](https://doi.org/10.1093/gbe/evu031)
* [https://doi.org/10.1093/gbe/evy014](https://doi.org/10.1093/gbe/evy014)
* [https://doi.org/10.1093/icb/42.3.652](https://doi.org/10.1093/icb/42.3.652)
* [https://doi.org/10.1093/molbev/msq147](https://doi.org/10.1093/molbev/msq147)
* [https://doi.org/10.1093/molbev/msu176](https://doi.org/10.1093/molbev/msu176)
* [https://doi.org/10.1093/sysbio/syr047](https://doi.org/10.1093/sysbio/syr047)
* [https://doi.org/10.1098/rspb.2013.1755](https://doi.org/10.1098/rspb.2013.1755)
* [https://doi.org/10.1098/rstb.2007.2233](https://doi.org/10.1098/rstb.2007.2233)
* [https://doi.org/10.1111/j.1439-0426.2008.01088.x](https://doi.org/10.1111/j.1439-0426.2008.01088.x)
* [https://doi.org/10.1111/jeu.12401](https://doi.org/10.1111/jeu.12401)
* [https://doi.org/10.1111/jeu.12691](https://doi.org/10.1111/jeu.12691)
* [https://doi.org/10.1111/jzs.12035](https://doi.org/10.1111/jzs.12035)
* [https://doi.org/10.1126/science.1251981](https://doi.org/10.1126/science.1251981)
* [https://doi.org/10.1186/1471-2148-10-209](https://doi.org/10.1186/1471-2148-10-209)
* [https://doi.org/10.1186/1471-2148-13-253](https://doi.org/10.1186/1471-2148-13-253)
* [https://doi.org/10.1186/s12862-015-0446-6](https://doi.org/10.1186/s12862-015-0446-6)
* [https://doi.org/10.1186/s43008-019-0005-7](https://doi.org/10.1186/s43008-019-0005-7)
* [https://doi.org/10.1201/B11867-9](https://doi.org/10.1201/B11867-9)
* [https://doi.org/10.1371/currents.tol.53ba26640df0ccaee75bb165c8c26288](https://doi.org/10.1371/currents.tol.53ba26640df0ccaee75bb165c8c26288)
* [https://doi.org/10.1371/journal.pbio.1000436](https://doi.org/10.1371/journal.pbio.1000436)
* [https://doi.org/10.1371/journal.pone.0049521](https://doi.org/10.1371/journal.pone.0049521)
* [https://doi.org/10.1371/journal.pone.0062510](https://doi.org/10.1371/journal.pone.0062510)
* [https://doi.org/10.1371/journal.pone.0066400](https://doi.org/10.1371/journal.pone.0066400)
* [https://doi.org/10.1371/journal.pone.0139068](https://doi.org/10.1371/journal.pone.0139068)
* [https://doi.org/10.2108/zsj.25.960](https://doi.org/10.2108/zsj.25.960)
* [https://doi.org/10.3389/fmicb.2014.00112](https://doi.org/10.3389/fmicb.2014.00112)
* pers. comm. Jordi Paps
* pers. comm. Iñaki RuizTrillo
