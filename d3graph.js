 var node_data, link_data;
 
 // D3 window
 function createSVG() {
     width = window.d3windowWidth;
     height = window.d3windowHeight;
     fill = d3.scale.category20();

     // mouse event vars
     selected_node = null;
     selected_link = null;
     selected_mesh = null;
     mousedown_link = null;
     mousedown_node = null;
     mouseup_node = null;
     mousedown_mesh = null;
     mouseup_mesh = null;
     
     selected_nodes = [];	//index=node. 1 if selected, 0 if not


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

function printJSON(p) {
	var html = "";
	for (var key in p) {
		if (p.hasOwnProperty(key)) {
			html += key + ": " + p[key] + " <br />";
		}
	}
	return html;
}

function updateDetails() {

	var html = "Selected: <br />";
	
	for (var i=1; i<=selected_nodes.length; i++) {
		if (selected_nodes[i]) {
			html += "<b>Node "+ i + ": </b><br />";
			//html += JSON.stringify(node_data[i-1].props, null, 1);
			html += printJSON(node_data[i-1].props);
			html += "<br />";
		}
	}

	document.getElementById('details').innerHTML = html;
	//console.log(node_data);
	//console.log(graph.nodes);

}

 function createGraph(graph) {
 	 node_data = graph.nodes;

     //Remove previous graph if we need to
     outer.selectAll("link").remove();
     outer.selectAll("node").remove();

             link = vis.selectAll(".link"),
             node = vis.selectAll(".node");

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
                         	deselectNode(id);
                         	deselectMesh(id);
                         }
                         else { 
                         	selectNode(id);
                         	selectMesh(id);                         	
                         }
                         
                         selected_link = null;                         
                         
                         updateDetails();

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

	function deselectNode(id) {
		
		var currnode = d3.selectAll(".node_selected");
	    currnode.classed("node_selected", function(d, i) {
	       				//deselect only current node
                       	return d.index != id;
	               	 	});
		selected_nodes[id] = 0;
			
		}
		
	function selectNode(id) {
		
		var currnode = d3.selectAll(".node");
       	currnode.classed("node_selected", function(d, i) {
       					//don't remove class for nodes that are already selected
       					if(this.classList.contains("node_selected")) {
       						return true;
       					}
                       	return d.index === id;
	               	 	});
		selected_nodes[id] = 1;
		
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


