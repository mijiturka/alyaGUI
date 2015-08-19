// Functions for outputting info to html

function updateSubdomainDetails() {

	var html = "Selected Subdomains: <br />";

	for (var i=0; i<selected_nodes.length; i++) {
		if (selected_nodes[i]) {
			html += "<b>Node "+ (i+1) + ": </b><br />";
			//html += JSON.stringify(node_data[i-1].props, null, 1);
			html += printJSON(node_data[i].props);
			html += "<br />";
		}
	}

	document.getElementById('subdomain_details').innerHTML = html;

}
	
function updateEventDetails() {

	var pointcloud = scene.getObjectByName( "pointcloud" );
	var selected_events = pointcloud.geometry.attributes.selected.array;	
	var point_ids = pointcloud.geometry.attributes.point_id.array;	

	var num_selected = 0;
	var html = "";

	for (var i=0; i<selected_events.length; i++) {
		if (selected_events[i]) {

			var event_id = point_ids[i]+1;
			
			html += "<b>Event "+ event_id + ": </b><br />";
			
			// image
			// TODO: url
			html += "<img src=\"" + "runs/cavtet4/events/cavtet4_";
			html += event_id;
			html += ".png\" />";				
			html += "<br />";
			
			// details
			html += printJSON( events_info[i] );
			
			num_selected ++;
		}
	}
	
	if (num_selected > 0) {
		var comment;
		if (num_selected == 1) comment = "<b> event selected: </b><br />";
		else comment = "<b> events selected: </b><br />";
		html = num_selected + comment + html;
	}

	document.getElementById('event_details').innerHTML = html;

}

function printEventList() {

	html = "Events: <br />";
	//html += "<table class=\"sortable\"><tr> <th>Id &nbsp;&#x25BE;</th> " +
	html += "<table> <tr>  <th>Id</th> " +
						  "<th>Rank</th>" +
						  "<th>Detection Type</th>" + 
						  "<th>Module</th>" + 
					"</tr>"
	
	events_info.forEach( function (event) {			
		html += "<tr>";			

//			console.log(event);
		html += "<td>" + event.index 	+ "</td>";
		html += "<td>" + event.rank 	+ "</td>";
		html += "<td>" + event.type 	+ "</td>";
		html += "<td>" + event.module 	+ "</td>";		
					
		/*for (property in event) {				
			html += "<td>" + event[property] + "</td>";
		}*/
		html += "</tr>";
	});

	html += "</table>"

	document.getElementById('event_list').innerHTML = html;

}

function printJSON(p, nokeys) {

	if (nokeys) {
		return printJSONValues(p);
	}

	var html = "";
	for (var key in p) {
		if (p.hasOwnProperty(key)) {
			if (key === "general") {
				html+= "<br />" + printJSON(p[key]) + "<br />";
			}
			else { 
				html += key + ": " + p[key] + " <br />" 
			};
		}
	}
	return html;
}

function printJSONValues(p) {
	var html = "";
	for (var key in p) {
		if (p.hasOwnProperty(key)) {
			html += p[key] + " <br />"; 
		}
	}
	return html;
}
