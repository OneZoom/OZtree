###Midnode


Each Midnode object contains following properties:

  1. Tree structure related:
    * upnode        (Midnode)
    * type          (String)
    * children 
    * c_indices
    * cl_code_range
    * cn_code_range
  2. Attributes of a species:
    * latin         (String)
    * common        (String)
    * richness_val  (Number)
    * redlist       (String)
    * lengthbr      (Number)
    * num_iucn
  3. Position related:
    * gvar          (Boolean)
    * dvar          (Boolean)
    * shapes
  
Details of some of the properties above:

  * upnode
  * type, one of  <br>
    \-\- "leaf_node" <br>
    \-\- "interior_node"
  * children
  ``` javascript
    [child1, child2]
  ```
  * c_indices: Storing where the children start and end indices are on the rawData. The sequence of the objects should be the same as the sequence of them in children array.
  ``` javascript
  [
    {
      start: 0
      end: rawData.length-1
    },
  ]
  ```
  * cl_code_range: Entry X in this array stores the range of metacodes of all leaves which are child X or child X's descendants.
  ``` javascript
  [
    {
      start_metacode: 0
      end_metacode: 1000
    }
  ]
  ```
  * cn_code_range: Entry X in this array stores the range of metacodes of all nodes which are child X or child X's descendants.
  ``` javascript
  [
    {
      start_metacode: 0
      end_metacode: 1000
    }
  ]
  ```
  
  * num_iucn: number of different iucn states from desc
  ``` javascript
  [1,2,3,4,5,6,7,8,9]
  ```
    
    
    