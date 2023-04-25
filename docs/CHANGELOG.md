#### OneZoom software versions
      
There have been 11 substantial upgrades to OneZoom over the last 9 years with versions spanning from version 1.0 (October 2012) to version 3.5 (October 2021). Some features from earlier versions have not been retained in the latest software, so versions 1.0 and 1.2 remain supported to provide access to these features - such as customisation of the view to accommodate a user's tree and the growth animation function for dated trees.

#### Version 3.5 'chocolate chip starfish' (current version - October 2021)

<a href="https://www.onezoom.org/static/images/user_guide/FullSize/Pop_col_scheme.jpg" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/user_guide/Pop_col_scheme.jpg" alt=""></a>
          
Includes all the features of version 3.4.1 but adds several improvements i) improved colour scheme for showing extinction risk of species ii) added colour scheme for showing the popularity index of species as a continuous colour gradient iii) main colour schemes now show randomly resolved polytomies in a different way on the tree for improved scientific accuracy and to avoid misunderstandings about the level of accuracy in the current tree. iv) colour blind friendly mode available for all colour schemes v) improved tabs for each species linking to other resources with better explanation around the IUCN resources and added links to GBIF vi) substantial improvements to the content and interpretation pages throughout the site vii) new resources explaining how to use the tree of life explorer viii) docker images for easier deployment by third parties ix) a range of minor bug fixes.
    
#### Version 3.4.1 'nervous shark' (obsolete)

Includes all the features of version 3.4 and adds new APIs to access vernacular names, ID mappings and representative images.

#### Version 3.4 (obsolete)

Includes all the features of version 3.3.1 and adds a completely redesigned landing page together with improvements to the site content as a whole.

#### Version 3.3.1 (obsolete)

<a href="https://www.onezoom.org/static/images/DandDWT1.png" target="_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/DandDWT1.png" alt=""></a>
      
Includes all the features of version 3.3 and adds code to build a museum tree of life display exhibit  in seconds.  In particular, i) the user interface has been customized for museum display use, ii) the display URL has been 'sandboxed' so that users can't break out and explore material outside the tree of life and taxa pages on Wikipedia, iii) a new tutorial has been added to the display, and iv) a 'screensaver' function ensures that unattended displays automatically reset and fly around the tree to attract potential users passing by.  A new launch page enables customization of the museum display including the home taxa location, language, view type and other settings.  Version 3.4 also features some updates to the menus and pages on the website outside of the tree of life explorer.

#### Version 3.3 (obsolete)

<a href="https://www.onezoom.org/static/images/Screenshots/FullSize/Polytomy.jpg" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/Screenshots/Polytomy.jpg" alt=""></a>

Includes all the features of version 3.2 and adds a polytomy view, performance enhancements, changes to the way images are processed to enable compatibility with the latest version of the Encyclopedia of Life, and specific developments to support the One Tree, One Planet tree view.

#### Version 3.2 (obsolete)

Includes all the features of version 3.1 and adds enhanced multi-language support, a new user interface for the tree explorer and a documented framework enabling others to easily design a complete OneZoom tree into their website or public display without needing to touch the core software.

#### Version 3.1 (obsolete)

Includes all the features of version 3.0 and adds substantial performance enhancements as well as basic multi-language support. Behind the scenes the core visualisation software has been entirely refactored and modularised in ECMAScript 6.

#### Version 3.0 (obsolete)

<a href="https://www.onezoom.org/static/images/Screenshots/all_life_PD.png" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/Screenshots/all_life_PD.png" alt=""></a>
      
Includes all the features of version 2.0 and adds dynamic loading and caching systems so that the entire tree of life can at last be viewed on a single page. A common ancestor search function was also added as well as a URL parser that stores your position in the tree.

#### Version 2.0 (obsolete)

A more advanced website incorporating a tree that spans the whole of life, semi-automated systems to keep the tree up to date, the ability to sponsor a leaf on the tree, improved visual design, and an enhanced user interface. This version incorporates mobile and touch screen support as well as embedded images from version 1.2 kiosk.

Some features were lost from version 1.2 variants: there is no longer an animal sound player, growth animation, kiosk version, customisable html embed function, or feature to load your own phylogeny. Version 1.2 still runs within version 2.0 to provide legacy support of these features.

#### Version 1.2 kiosk

<a href="https://www.onezoom.org/static/images/gallery/sydney_kiosk_small.jpg" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/gallery/sydney_kiosk_small.jpg" alt=""></a>
      
This is very different from the other version 1.2 variants in terms of functionality. This code provides an easy to deploy explorer for touch screen environments in public venues. It has been developed using feedback from surveys and observations made at venues hosting the display. Features include... embedded images, embedded animal sounds, dynamic zooming around the tree when not in use, full search functionality and a bespoke on screen keyboard so that the system keyboard need not be exposed to users.

[Download OneZoom version 1.2 kiosk](https://www.onezoom.org/static/downloads/OneZoom_V1.2_Kiosk.zip), note that to function properly this also requires raw data that is not included in the download. You will need to unzip the software, then <a href="mailto:mail@onezoom.org">contact us</a> to request an example data set (we have tetrapods and plants). You can then use this to learn the file formats and layouts necessary to input your own data without needing to edit the code itself.
        
#### Version 1.2

The most advanced OneZoom website that can be hosted simply by copying the files into your webspace. More recent versions of OneZoom from 2.0 onwards require running your own Python based webserver and SQL database server.

All downloads of OneZoom version 1.2 are released under an <a href="http://opensource.org/licenses/MIT" target="_blank">MIT license</a> which is <a href="http://opensource.org" target="_blank">OSI approved</a>. Please note that the zip files also contain Boot Strap and jQuery which are built by third parties and licensed for further use under those third party license rules (please open the source files for information). The zip files may also include icons for e.g. facebook and twitter which are should be used under the terms of those organisations but are provided here for convenience.

[Download OneZoom 1.2](https://www.onezoom.org/static/downloads/OneZoom_V1.2.zip), this is the complete OneZoom website fully functional as it was live online until April 2016 when version 2.0 was released.
 
##### Embed a customised OneZoom tree in your website using version 1.2.
 
Without downloading or installing any software you can still use our <a href="embed.htm">embed and link tool</a> if you want to embed custom versions of a tree that's already on OneZoom. After selecting the settings you want the page will generate a short piece of code that you can copy any paste into your website to give you a OneZoom visualisation. This can incorporate highlights of pairs of taxa and their common ancestors as well as zooming animations and user interaction. If you want to use your own tree data, however, you will need to download the code and edit the data sources.

#### Version 1.2 lite

<a href="https://www.onezoom.org/static/images/treeThumbs/FullSize/porifera.png" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/treeThumbs/porifera.png" alt=""></a>
            
A cut down version 1.2 designed to be easier to edit and use to build your customised explorable tree pages.
<a href="https://www.onezoom.org/static/downloads/OneZoom_V1.2_Lite.zip">Download OneZoom 1.2 lite</a>

##### Making supplementary material for your papers using version 1.2 lite

If you've got a big and impressive tree and are interested in having it appear on OneZoom we can work with you on this, and we can time the date your page goes live with the embargo period of your associated journal publication.

1. Download and uncompress the [cut down version of the 2015 website](https://www.onezoom.org/static/downloads/OneZoom_V1.2_Lite.zip)
2. You should only need to edit the files in the user directory - there are two examples here, one for tetrapods and the other for plants.
3. Each example data set contains a Newick tree file (no polytomies) and a metadata file which is indexed by numbers that must correspond to the leaves of the tree file.
4. Finally, there is a Javascript file in which you can edit much of the tree drawing without having to worry about the core tree drawing parts of the code.

#### Version 1.0

<a href="https://www.onezoom.org/static/images/gallery/highres/OneZoom_SS5.jpg" target = "_blank" class="thumbnail"><img src="https://www.onezoom.org/static/images/gallery/OneZoom_SS5_small.jpg" alt=""></a>

The first version of OneZoom with basic features released alongside <a href="http://www.plosbiology.org/article/info:doi/10.1371/journal.pbio.1001406" target="_blank">a publication in PLoS Biology</a>. This version of OneZoom will still be useful if you want to quickly explore a Newick formatted phylogeny online. It also has the advantage of comprising of a single easily portable file which includes all code and data, later versions of OneZoom all use complex directory structures containing a range of files. <a href="https://www.onezoom.org/static/downloads/OneZoom_V1.0.zip">Download OneZoom version 1.0</a> licensed under an <a href="http://opensource.org/licenses/MIT" target="_blank">MIT license</a> which is <a href="http://opensource.org" target="_blank">OSI approved</a>
    
##### View your own data online using version 1.0
      
Please note that compared the latest version of OneZoom, this version 1.0 visualisation may appear clunky, and there is no touch screen support.  The feature to load your own data was dropped from version 2.0 and above so that we could focus our limited resources more effectively on providing an easily accessible explorer for the complete tree of life.  It would be a relatively small package of development to make the latest version of OneZoom capable of displaying other trees.
       
If you do go ahead and use this feature as it stands now, your data is only stored on your personal computer for this visualisation and is not transmitted over the internet so it is safe to visualise unpublished data in this way.  If you prefer, you can still download OneZoom version 1.0 and do everything locally and offline.
      
1. First, <a href="https://www.onezoom.org/static/OZLegacy/OZ_VPX361_mammals.htm" target="_blank">load the original single stand alone file version of OneZoom in a new window</a>. This code is a slightly updated version of the supplementary material to the article in PLoS Biology.  The code is also available for download as a zip in the downloads section of this page.
2. The mammal data will load by default. On the top of the page there is a row of buttons: Search, Grow, Options, Data, Reset, ... You need to press the "Data" button.
3. A text box will appear at the bottom of the page, next to this is a button titled "Load data".
4. Your data should be in Newick format with no polytomies (polytomies should be expressed with a number of nodes connected with branch lengths of 0).  Branch lengths, if present, should be ultrametric and calibrated with units of millions of years.
5. Only load one tree at a time and make sure there is no other text either side of the Newick code for that tree. Copy and paste the Newick format data for your tree into the text field at the bottom of the page and press the "Load data" button.  Don't worry if your computer doesn't seem to have put all the data into the text box. Not all browsers are used to having very long strings of data in the text box, but the data is normally still there and loading will still work.
6. Be patient, if your tree has 50,000 nodes or more it can take a minute or so to load and may use a noticeable chunk of ram on your computer.  Most computers should be able to handle tress with 1 million nodes or more if you are willing to wait for it to load.
