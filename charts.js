// Line chart functionality

//TODO: remove spaces from attributes

function createChart(data_url, xAttribute, yAttributes, colors, WIDTH, HEIGHT, yScale_type, manip_func) {

	// read data, calculate domains, display graph

	var data=[];

	// two files to read from
	if (data_url.constructor === Array) {
		
		d3.csv(data_url[0], function (data) {	
	
			d3.csv(data_url[1], function (data2) {	
		
				// merge data with data2
				for (i in data) {
					for (att in data2[i]) {
						data[i][att] = data2[i][att];
					}
				}
				
				// parse to float
				data.forEach( function(d) {
					yAttributes.forEach( function (att) {
						d[att] = parseFloat(d[att]);
					});			
				});
				
				// optional data manipulation function
				if (manip_func != undefined) data = manip_func(data);
				
				setAxesDomains(data);
				showChart(data);
				addGrids(true, true);
				addLabels(xAttribute, yAttributes);

			});

		});		
		
	}

	// single file
	else {
	
		d3.csv(data_url, function (data) {	
	
			// parse to float
			data.forEach( function(d) {
				yAttributes.forEach( function (att) {
					d[att] = parseFloat(d[att]);
				});			
			});
		
			// optional data manipulation function
			if (manip_func != undefined) data = manip_func(data);
		
			setAxesDomains(data);
			showChart(data);
			addGrids(true, true);
			addLabels(xAttribute, yAttributes);
	
		});
	
	}



	// graph variables

	var legendRectSize = 18,
		legendSpacing = 4,
		legendRectH = legendRectSize + legendSpacing;

	if (!WIDTH || !HEIGHT) {
		WIDTH = 250,
		HEIGHT = 125;
	}
	var	MARGINS = {
			top: 20,
			right: 20,
			bottom: 20,
			left: 50
			};		
	
	var	xScale = d3.scale.linear()
				.domain([0,30])		// will be changed dynamically
				.range([MARGINS.left, WIDTH - MARGINS.right]);
	
	var yScale;			
	if (yScale_type === "log") {	yScale = d3.scale.log();	}
	else {	yScale = d3.scale.linear();	}
	yScale.domain([0,1])		// will be changed dynamically
		  .range([HEIGHT - MARGINS.top, MARGINS.bottom]);
		
	var	xAxis = d3.svg.axis()
				.scale(xScale)
				.ticks(4),
		yAxis = d3.svg.axis()
				.scale(yScale)
				.orient("left")
				.ticks(6);
	var xTicks = 6, 
		yTicks = 0;

	var linechart = d3.select("#problem_charts")
					.append("svg")
		            .attr("width", WIDTH + 25)
		            .attr("height", HEIGHT + (colors.length+1) * legendRectH);	



	function setAxesDomains(data) {
	
		// find max and min values of the attributes to be plotted
		
		var max_all = data[0][yAttributes[0]];
		var min_all = data[0][yAttributes[0]];

		yAttributes.forEach( function (att) {
		
			max_att = d3.max(data, function (d) {
				return d[att];
			});
			min_att = d3.min(data, function (d) {
				return d[att];
			});

			if (max_att > max_all) max_all = max_att;
			if (min_att < min_all) min_all = min_att;	

		});		

		// set domain values		
		xScale.domain([1, data.length]);
		yScale.domain([min_all, max_all]);
	
	}

	function showChart(data) {

		// axes
		linechart.append("g")
				 .attr("class", "axis")
				 .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
				 .call(xAxis);
		linechart.append("g")
				 .attr("class", "axis")
				 .attr("transform", "translate(" + MARGINS.left + ",0)")
				 .call(yAxis);		

		// lines
		color_id = 0;
				
		yAttributes.forEach( function (att) {
		
			var lineGen = d3.svg.line()
				.x(function(d) { return xScale(d[xAttribute]); })
				.y(function(d) { return yScale(d[att]); });			
				
			linechart.append("path")
				.attr("d", lineGen(data))
				.attr("stroke", colors[color_id])
				.attr("stroke-width", 2)
				.attr("fill", "none");
			
			color_id++;
		});

	}

	function addLabels(xLabel, yLabels) {
	
		// x axis	
		linechart.append("text")
			.attr("class", "x label")
			.attr("text-anchor", "end")
			.attr("x", WIDTH - MARGINS.right)
			.attr("y", HEIGHT + MARGINS.bottom/1.5)
			.text(xLabel);	
	

		// y paths legend
		var legend = linechart.selectAll('.legend')
		  .data(colors)
		  .enter()
		  .append('g')
		  .attr('class', 'legend')
		  .attr('transform', function(d, i) {
				var h = legendRectSize + legendSpacing;
				var offset = h * colors.length;
				var horz = MARGINS.left;
				var vert = HEIGHT + (MARGINS.bottom * (colors.length+1)) + i * h - offset;

				return 'translate(' + horz + ',' + vert + ')';
		  });
		  
		legend.append('rect')                                     
          .attr('width', legendRectSize)                          
          .attr('height', legendRectSize)                         
          .style('fill', function(d, i) {
          	return colors[i];
          });                                                                  
          
        legend.append('text')                                     
          .attr('x', legendRectSize + legendSpacing)              
          .attr('y', legendRectSize - legendSpacing)              
          .text(function(d, i) { return yAttributes[i]; });
	}

	function addGrids(addx, addy) {

		if (addx) {
		linechart.selectAll("line.verticalGrid")
			.data(xScale.ticks(xTicks))
			.enter()
			.append("line")
			.attr(
			{
				"class":"grid",
				"x1" : function(d){ return xScale(d);},
				"x2" : function(d){ return xScale(d);},
			 	"y1" : MARGINS.right,
				"y2" : HEIGHT       
			 });
		}

		if (addy) {
		linechart.selectAll("line.horizontalGrid")
			.data(yScale.ticks(yTicks))
			.enter()
			.append("line")
			.attr(
			{
				"class":"grid",
			 	"x1" : MARGINS.left,
				"x2" : WIDTH - MARGINS.right,
				"y1" : function(d){ return yScale(d);},
				"y2" : function(d){ return yScale(d);}
			 });
		}
		 
	}
}	



// usage

// creates standard line charts
    	
function createLineCharts(width, height) {

	xAtt = 'Iteration';
	colors = ['green', 'blue'];


	chart1 = ['Momentum Residual', ' Continuity Residual'];
	createChart("runs/cavtet4/cavtet4.cvgCharts2.csv", xAtt, chart1, colors, width, height, "log");


	chart2 = [' Velocity Linf', ' Pressure Linf'];
	createChart("runs/cavtet4/cavtet4.cvgCharts2.csv", xAtt, chart2, colors, width, height, "log");


	colors3 = ['red', 'green', 'blue'];
	function getAbs(data) {
		data.forEach( function(d) {
			d[' Pressure Minimum'] = Math.abs(d[' Pressure Minimum']);
			d[' Pressure Maximum'] = Math.abs(d[' Pressure Maximum']);
		});
		return data;
	}

	chart3 = [' Velocity Maximum', ' Pressure Minimum', ' Pressure Maximum'];
	createChart("runs/cavtet4/cavtet4.cvgCharts2.csv", xAtt, chart3, colors3, width, height, "linear", getAbs);


	chart4 = [' Momentum', ' Continuity'];
	files = ["runs/cavtet4/cavtet4.solverCharts_1.csv", "runs/cavtet4/cavtet4.solverCharts_2.csv"];
	createChart(files, xAtt, chart4, colors);
}
