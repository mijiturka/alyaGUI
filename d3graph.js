 // D3 window
 
 var node_data, link_data;
 
 function createSVG() {
     width = window.d3windowWidth;
     height = window.d3windowHeight;
     fill = d3.scale.category20();

     // mouse event vars
     selected_node 	= null;
     selected_link 	= null;
     selected_mesh 	= null;
     mousedown_link = null;
     mousedown_node = null;
     mouseup_node 	= null;
     mousedown_mesh = null;
     mouseup_mesh 	= null;
     
     selected_nodes = [];	// index=subdomain. 1 if selected, 0 if not


     // init svg
     outer = d3.select("#chart")
         .append("svg:svg")
         .attr("width", width)
         .attr("height", height)
         .attr("pointer-events", "all");

     vis = outer
         .append('svg:g')
         .call(d3.behavior.zoom().on("zoom", rescale))
         .on("dblclick.zoom", null)
         .append('svg:g')
         .on("mousemove", mousemove)
         .on("mousedown", mousedown)
         .on("mouseup", mouseup);

     vis.append('svg:rect')
         .attr('width', width)
         .attr('height', height)
         .attr('fill', '#F0F0F0');

     // init force layout
     force = d3.layout.force()
         .size([width, height])
         .linkDistance(50)
         .charge(-5000)
         .on("tick", tick);
 }

function updateSVG() {
    width = window.d3windowWidth;
    height = window.d3windowHeight;
    outer.attr("width", width)
         .attr("height", height)
    vis.selectAll("rect")
        .attr('width', width)
        .attr('height', height);
    force.size([width, height]);
}

//links[i] contains an array of all of i's targets

function getLinkData(graph) {
 
 	var links = {};
	for (node = 0; node < graph.nodes.length; node++) {
	
		var keys = Object.keys(graph.links).filter(function(k) 
						{ return graph.links[k].source === node});
	
		var targets = [];
		keys.forEach( function(k) {
			targets.push(graph.links[k].target);
			});
			
		links[node] = targets;
	}
	return links;
	
}

function createGraph(graph) {
 
 	 // copy object without extra JS properties
	 node_data = JSON.parse(JSON.stringify(graph.nodes));  
 	 link_data = getLinkData(graph);

     // Remove previous graph if we need to
     outer.selectAll("link").remove();
     outer.selectAll("node").remove();

             link = vis.selectAll(".link"),
             node = vis.selectAll(".node");
             
             console.log(node_data.length);
             for (var i=0; i<node_data.length; i++) {
             	selected_nodes[i] = 0;
             }
             
			 colorby = "NELEM";
             var valmin = d3.min(function() {
                 var temp = [];
                 graph.nodes.forEach(function(d) {
                     temp.push(d.props[colorby]);
                 });
                 return temp
             }());
             var valmax = d3.max(function() {
                 var temp = [];
                 graph.nodes.forEach(function(d) {
                     temp.push(d.props[colorby]);
                 });
                 return temp
             }());
             var GraphColor = d3.scale.linear()
                 .domain([valmin, valmax])
                 .range(["#d7191c", "#ffffbf", "#2c7bb6"])
                 .interpolate(d3.interpolateHcl);

             force
                 .nodes(graph.nodes)
                 .links(graph.links);

             link = link.data(graph.links);

             link.enter().append("line")
                 .attr("class", "link")
                 .classed("link_selected", function(d) {
                     return d === selected_link;
                 })
                 .on("mousedown",
                     function(d) {
                         mousedown_link = d;
                         if (mousedown_link == selected_link) selected_link = null;
                         else selected_link = mousedown_link;
                         selected_node = null;
                     });

             node = node.data(graph.nodes, function(d) {
                 return d.id;
             })
                 .enter().append("circle")
                 .attr("class", "node")
                 .attr("r", 12)
                 .style("fill", function(d) {
                     return GraphColor(d.props[colorby]);
                 })
                 .on("mousedown",
                     function(d, i) {
                         // disable zoom
                         //vis.call(d3.behavior.zoom().on("zoom"), null);
                         
                         mousedown_node = d;
                         mousedown_mesh = i;
                         
                         var is_selected = this.classList.contains("node_selected");
                         var id = d.index;
                         
                         if (is_selected) { 
                         	deselectSubdomain(id);
                         }
                         else { 
                         	selectSubdomain(id);
                         }
                         console.log(selected_nodes);
                         
                         selected_link = null;                         
                         
                         updateSubdomainDetails();

                     })
                 .on("mousedrag",
                     function(d) {
                         // redraw();
                     })
                 .on("mouseup",
                     function(d) {
                     
                         if (mousedown_node) {
                             mouseup_node = d;
                             if (mouseup_node == mousedown_node) {
                                 resetMouseVars();
                                 return;
                             }
                             // enable zoom
                             vis.call(d3.behavior.zoom().on("zoom"), rescale);
                         }
                     });

             force.start();
    }
		
	function selectNode(id, stroke_class) {
	
		if (typeof stroke_class === "undefined") {
          	stroke_class = "node_selected";
          	selected_nodes[id] = 1;
        }
		
		var nodes = d3.selectAll(".node");
       	nodes.classed(stroke_class, function(d, i) {
       					// don't remove class for nodes that are already selected
       					if(this.classList.contains(stroke_class)) {
       						return true;
       					}
                       	return d.index === id;
	               	 	});		
		
	}
		
	function deselectNode(id) {
				               	 	
		selected_nodes[id] = 0;
	
		var nodes = d3.selectAll(".node_selected");
		nodes.classed("node_selected", function(d, i) {
		   				// deselect only current node
		               	return d.index != id;
		           	 	});
		
		var neighbours = d3.selectAll(".node_neighbour");
		neighbours.classed("node_neighbour", function(d, i) {
						// deselect only current node
		               	return d.index != id;
		           	 	});
		
	}



     function tick() {
         link.attr("x1", function(d) {
             return d.source.x;
         })
             .attr("y1", function(d) {
                 return d.source.y;
             })
             .attr("x2", function(d) {
                 return d.target.x;
             })
             .attr("y2", function(d) {
                 return d.target.y;
             });

         node.attr("cx", function(d) {
             return d.x;
         })
             .attr("cy", function(d) {
                 return d.y;
             });
     }

     function mousedown() {
         if (!mousedown_node && !mousedown_link) {
             // allow panning if nothing is (being) selected
             vis.call(d3.behavior.zoom().on("zoom"), rescale);
             return;
         }
     }

     function mousemove() {
         if (!mousedown_node) return;
     }

     function mouseup() {
         if (mousedown_node) {
             // hide drag line

             if (!mouseup_node) {
                 // add node
             }
         }
         // clear mouse event vars
         resetMouseVars();
     }

     // rescale g
     function rescale() {
         trans = d3.event.translate;
         scale = d3.event.scale;

         vis.attr("transform",
             "translate(" + trans + ")" + " scale(" + scale + ")");
     }

     function resetMouseVars() {
         mousedown_node = null;
         mouseup_node = null;
         mousedown_link = null;
         mousedown_mesh = null;
         mouseup_mesh = null;
     }

     document.getElementById('colorby').addEventListener('change', function() {
         colorby = this.value;
         valmin = d3.min(function() {
             var temp = [];
             graph.nodes.forEach(function(d) {
                 temp.push(d.props[colorby]);
             });
             return temp
         }());
         valmax = d3.max(function() {
             var temp = [];
             graph.nodes.forEach(function(d) {
                 temp.push(d.props[colorby]);
             });
             return temp
         }());
         GraphColor.domain([valmin, valmax]);
         node.transition()
             .style("fill", function(d) {
                 return GraphColor(d.props[colorby]);
             })

     });

createSVG();


