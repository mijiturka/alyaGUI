// WebGL window

        if (!Detector.webgl) Detector.addGetWebGLMessage();

        var container, stats, controls;
        var rotate = false;
        var raycaster, mouse = new THREE.Vector2(), INTERSECTED, INTERSECTED_POINTS;
        var prevMaterial;

        var camera, cameraTarget, scene, renderer;
        var scale_factor = 6;
        
        var select_neighbours = false;
        highlight_layers = [];		// number of selections that cause highlighting for each mesh
        selected_subdomains = [];	// index=subdomain. 1 if selected, 0 if not
        
        var groupGeometry = null;
        var xhr, pcBuffer;
        var EPC_intensity, HEPC_intensity, SEPC_intensity;

        init();
        animate();

        function init() {

            cont = d3.selectAll("#threeDplot");
            container = cont[0][0];		// dirty trick to get the DOM element

			//need this? same value before and after setting
            window.GLwindowHeight = window.innerHeight-window.d3windowHeight;
            //commented from the start - need this?
	        //window.GLwindowWidth =

			camera = new THREE.PerspectiveCamera(35, window.GLwindowWidth / (window.GLwindowHeight ), 1, 15);
            //camera.position.set(1.5, 0.45, 1.5);
            camera.position.set(-1.5, -0.5, 1.5);
            cameraTarget = new THREE.Vector3(0, 0.15, 0);

            scene = new THREE.Scene();            
            scene.fog = new THREE.Fog(0x72645b, 2, 15);

			//for getting a normal view of cube, when cube scaled x6
            /*camera = new THREE.PerspectiveCamera(35, window.GLwindowWidth / (window.GLwindowHeight ), 1, 40);
            camera.position.set(-5, 1.45, 9);
            scene.fog = new THREE.Fog(0x72645b, 2, 20);*/

            // ground

			//possibly better to use PlaneBufferGeometry
            var plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhongMaterial({
                ambient: 0x999999,
                color: 0x999999,
                specular: 0x1F1F1F
            }));
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = -0.5;            
            //with receiveShadow it doesn't show; without it you can't see the cylinder
            //scene.add(plane);
            //plane.receiveShadow = true;

			// materials 
			
			//TODO: should we use these colours?

            NormalMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
                wireframeLinewidth: 1,
                transparent: true,
                opacity: 0.1,
                name: "Normal"
            });
            HighlightMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
                wireframeLinewidth: 1,
                transparent: true,
                opacity: 1.0,
                color: 0xdd0c24,
                name: "Highlight"
            });
            HighlightMaterialOpaque = new THREE.MeshBasicMaterial({
                wireframe: true,
                wireframeLinewidth: 1,
                transparent: true,
                opacity: 0.1,
                color: 0xdd0c24,
                name: "Highlight Opaque"
            });
            HoverMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
                wireframeLinewidth: 1,
                transparent: true,
                opacity: 0.1,
                color: 0x0000ff,
                name: "Hover"
            });
            
            EventPointColor = new THREE.Color( 1, 1, 0 );
            HighlightEventPointColor = new THREE.Color( 1, 1, 1 );            
            SelectedEventPointColor = new THREE.Color( 0, 1, 0 );
            EPC_intensity = 1, HEPC_intensity = 1, SEPC_intensity = 1;

            meshes = [];
            loader = new THREE.STLLoader();

            // lights 
            
            //seems they don't change anything because of using wireframe.

            scene.add(new THREE.AmbientLight(0x777777));

            addShadowedLight(1, 1, 1, 0xffffff, 1.35);
            addShadowedLight(0.5, 1, -1, 0xffaa00, 1);

            // renderer

            renderer = new THREE.WebGLRenderer({
                antialias: true
            });
            renderer.setSize(window.GLwindowWidth, window.GLwindowHeight);
            
            renderer.setClearColor(scene.fog.color, 1);

            renderer.gammaInput = true;
            renderer.gammaOutput = true;

            renderer.shadowMapEnabled = true;
            renderer.shadowMapCullFace = THREE.CullFaceBack;

            container.appendChild(renderer.domElement);
            
            // camera controls
            
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.addEventListener( 'change', render );
            
            // interaction with separate meshes
            
            raycaster = new THREE.Raycaster();
            document.getElementById("threeDplot").addEventListener( 'mousemove', onMouseMove, false );
            document.getElementById("threeDplot").addEventListener( 'click', onClick, false );
            
            // event points
		
			displayEvents();			
            
            // stats

            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            container.appendChild(stats.domElement);

        }



        function addShadowedLight(x, y, z, color, intensity) {

            var directionalLight = new THREE.DirectionalLight(color, intensity);
            directionalLight.position.set(x, y, z)
            scene.add(directionalLight);

            directionalLight.castShadow = true;
            //directionalLight.shadowCameraVisible = true;	//for debugging

            var d = 1;
            directionalLight.shadowCameraLeft = -d;
            directionalLight.shadowCameraRight = d;
            directionalLight.shadowCameraTop = d;
            directionalLight.shadowCameraBottom = -d;

            directionalLight.shadowCameraNear = 1;
            directionalLight.shadowCameraFar = 4;

            directionalLight.shadowMapWidth = 1024;
            directionalLight.shadowMapHeight = 1024;

            directionalLight.shadowBias = -0.005;
            directionalLight.shadowDarkness = 0.15;

        }



		// event points
		
		
		// read event positions from file
		
		function displayEvents() {
	
			xhr = new XMLHttpRequest();
			sendRequest('runs/cavtet4/events/cavtet4-events.log', xhr);	//TODO: file shouldn't be hardcoded

		}

		// coordinates start at (0, 0, 0), i.e center of lower plane of mesh group.
		
		function getPositions(response) {

			var x, y, z;
			var content = response.split("\n");
			
			var positions = new Float32Array( content.length );
			var pos_i = 0;
			
			for (var line = 0; line < content.length; line++) {
				
				//get the last three numbers on this line
				var xyz = content[line].split(" ").filter(
					function(element) {
						if (element === "0.000000E+00") return true;
						return Number(element);
					}).splice(-3);
				
				if (xyz != "") {
					x = parseFloat(xyz[0]);
					y = parseFloat(xyz[1]);
					z = parseFloat(xyz[2]);
			
					positions[3*pos_i]	   = x;
					positions[3*pos_i + 1] = y;
					positions[3*pos_i + 2] = z;
			
					pos_i++;
				}
			}
			
			return positions;
		}

		function sendRequest(url, xhr) {
		
			xhr.onload = function () {	};
			xhr.open('GET', url);
			xhr.onreadystatechange = clientSideUpdate;
			xhr.send();
		}

		function clientSideUpdate() {

			if (xhr.readyState === 4) {
		
				var positions = getPositions(this.responseText);
				
				//TODO: do this once meshes are actually loaded...
				setTimeout( function() {	
							
					pcBuffer = generatePointcloud( EventPointColor, positions);

					pcBuffer.position.set( 0, 0, 0 );	
					pcBuffer.rotation.set(-Math.PI / 2, 0, 0);			
									
					//WHY? Shouldn't coordinates be scaled by scale_factor?
					/*var scale = 1/scale_factor;
		           	pcBuffer.scale.set(scale, scale, scale);*/
		
					scene.add( pcBuffer );
									
				} , 300);				
			}
		}
	
	
		// display event points
	
		function generatePointcloud(color, positions) {
		
			var pointSize = 0.1;		
			var sprite = THREE.ImageUtils.loadTexture( "disc.png" );
			
			var geometry = generatePointCloudGeometry( color, positions );
			var material = new THREE.PointCloudMaterial( { size: pointSize, map: sprite, vertexColors: THREE.VertexColors, blending: THREE.AdditiveBlending, depthTest: false, transparent : true } );
			var pointcloud = new THREE.PointCloud( geometry, material );
			pointcloud.name = "pointcloud";

			return pointcloud;

		}

		function generatePointCloudGeometry(color, positions) {

			var numPoints = 34; //TODO: not a hard-coded number

			var geometry = new THREE.BufferGeometry();

			//an array of size just numPoints creates weird errors...?
			//var indices = new Float32Array( numPoints );
			var indices = new Float32Array( numPoints*3 );
			var colors = new Float32Array( numPoints*3 );
			var selected = new Uint8Array( numPoints );			

			var i = numPoints;
			while( i-- ) selected[i] = 0;
			
			for (var i = 0; i < numPoints; i++) {
				
				//indices[ i ] = i;
				//indices[ 3*i ] = indices[ 3*i+1 ] = indices[ 3*i+2 ] = i;
				indices[ 3*i ] = i;
				indices[ 3*i+1 ] = i;
				indices[ 3*i+2 ] = i;		
						
				colors[ 3*i ] 	= color.r * EPC_intensity;
				colors[ 3*i+1 ] = color.g * EPC_intensity;
				colors[ 3*i+2 ] = color.b * EPC_intensity;				
			}
			
			//TEST: first point's in blue
			var c = new THREE.Color(0x0000ff);
			colors[0] = c.r * EPC_intensity;
			colors[1] = c.g * EPC_intensity;
			colors[2] = c.b * EPC_intensity;			
			
			geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
			geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );	
			//geometry.addAttribute( 'point_id', new THREE.BufferAttribute( indices, 1 ) );		
			geometry.addAttribute( 'point_id', new THREE.BufferAttribute( indices, 3 ) );
			geometry.addAttribute( 'selected', new THREE.BufferAttribute( selected, 1 ) );			
			
			geometry.computeBoundingBox();

			return geometry;

		}
	
		// functions for getting relative coordinates if coordinates start at the center of the mesh group.
		// currently not used
	
		function getRelativePosition(x, y, z) {
			
			var point;
			
			// function called on vector
			if (typeof y === "undefined") {
				point = x.clone();					
			// function called on coordinates	
			} else {
				point = new THREE.Vector3(x, y, z);
			}

			//console.log("Point original:" + point.x + " " + point.y + " " + point.z);
			
			if (groupGeometry) {
				point.add(getCenter());
			}
			else { console.log("Warning: Mesh group bounding box was not loaded on time, point positions may be incorrect"); }
			
			//console.log("Point:" + point.x + " " + point.y + " " + point.z);
			
			return point;
			
		}

		function getCenter() {
			
			var center = new THREE.Vector3(0, 0, 0);
			
			// compute actual center
			if (groupGeometry) {			
				groupGeometry.computeBoundingBox();

				center = new THREE.Vector3();
				center.addVectors(groupGeometry.boundingBox.max, groupGeometry.boundingBox.min);
				center.divideScalar(2);

			}
			else { console.log("Warning: Mesh group bounding box was not loaded on time, center may be incorrect"); }
			
			//console.log(groupGeometry.boundingBox.max.z + " " + groupGeometry.boundingBox.min.z);
			
			return center;
			
		}
			
		
	
		// interaction with separate meshes
		
		function onMouseMove( event ) {

			event.preventDefault();
			
			var x = event.clientX - document.getElementById("threeDplot").offsetLeft;
			var y = event.clientY - document.getElementById("threeDplot").offsetTop;			

			mouse.x = ( x / window.GLwindowWidth ) * 2 - 1;
			mouse.y = - ( y / window.GLwindowHeight ) * 2 + 1;

		}
		
		function onClick( event ) {

			event.preventDefault();
			
			var vector, raycasterClick, intersectsClick, selected_id;
			
			vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 ).unproject(camera);
			raycasterClick = new THREE.Raycaster( camera.position, vector.sub(camera.position).normalize() );
			raycasterClick.params.PointCloud.threshold = 0.05;
			
			intersectsClick = raycasterClick.intersectObjects( scene.children );
			
			if ( intersectsClick.length > 0 ) {
			
				// points selection
			
				var pts_intersected = [];

				intersectsClick.forEach( function(inter) {
						if (inter.object.name === "pointcloud") pts_intersected.push(inter);
					});
					
				if (pts_intersected) {												
					selectPoints(pts_intersected);					
				}
			
				// meshes selection
			
				selected_id = intersectsClick[0].object.realId;		
				
				if ( prevMaterial != HighlightMaterial ) {
					selectSubdomain( selected_id );
				}
				else {
					deselectSubdomain( selected_id );
				}

				updateSubdomainDetails();
			}

		}		
				
		function toggleNeighbours() {

			var is_checked = false;
			
			if (document.getElementById('showNeighbours').checked) {
				is_checked = true;
        	} 
        
        	// update
        	
        	// deselect everything
        	var selected_temp = selected_subdomains.slice();
        	deselectAll();
        	selected_subdomains = selected_temp.slice();
            	
            // reselect what we need
            select_neighbours = is_checked;                        
           	for (var i = 0; i < selected_subdomains.length; i++) {
           		if ( selected_subdomains[i] ) {
           			selectSubdomain(i);
           		}
           	}
        	
		}	
		
		
		
		// mesh selection
		
		function selectSubdomain(selected_id) {

			// select neighbours
			
			if (select_neighbours) {
				
				link_data[selected_id].forEach( function(id){
					
					highlight_layers[id]++;
							
					// don't make opaque if previously selected
					if (meshes[id].material != HighlightMaterial) {		
						selectMesh(id, HighlightMaterialOpaque);						
						selectNode(id, "node_neighbour");	
					}
				});
			}
										
			// select this subdomain
			
			selectMesh(selected_id);										
			selectNode(selected_id);
			
			selected_subdomains[selected_id] = 1;
		
		}
		
		function deselectSubdomain (selected_id) {
					
			// deselect neighbours
			
			if (select_neighbours) {

				link_data[selected_id].forEach( function(id){
						
					highlight_layers[id]--;				
										
					// don't deselect if previously selected, or if highlighted by another selection
					if (meshes[id].material != HighlightMaterial && highlight_layers[id] === 0) {
						deselectMesh(id);								
						deselectNode(id);
					}
				});
			}
					
			// deselect this subdomain
			
			if (highlight_layers[selected_id] === 0) {
				deselectMesh(selected_id);						
				deselectNode(selected_id);							
			}
			else {											
				prevMaterial = HighlightMaterialOpaque;
				
				selectMesh(selected_id, HighlightMaterialOpaque);	
						
				deselectNode(selected_id);
				selectNode(selected_id, "node_neighbour");			
			}	
						
			selected_subdomains[selected_id] = 0;											
		
		}
		
		function deselectAll() {
			
			for (var i = 0; i < selected_subdomains.length; i++) {
				if (selected_subdomains[i]) {				
					deselectSubdomain(i);					
				}
			}	
					
		}
        
        function selectMesh(id, material) {
   
          	if (typeof material === "undefined") {
          		material = HighlightMaterial;
          	}
          	
	        meshes[id].material = material;
	        prevMaterial = material;
			
        }
        
        function deselectMesh(id) {
	                   	 	
	        meshes[id].material = NormalMaterial;
			prevMaterial = NormalMaterial;

		}


		// point selection
		
		function highlightPoints(pts_intersected) {
		
		//console.log("highlight called: " + pts_intersected.length);
			
			var pointcloud = scene.getObjectByName( "pointcloud" );
			var colors = pointcloud.geometry.attributes.color;
			var selected = pointcloud.geometry.attributes.selected;
		
			for (var i = 0; i < pts_intersected.length; i++) {

				var id = pts_intersected[i].index;		
			
				colors.array[id*3] 	   = HighlightEventPointColor.r * HEPC_intensity;
				colors.array[id*3 + 1] = HighlightEventPointColor.g * HEPC_intensity;
				colors.array[id*3 + 2] = HighlightEventPointColor.b * HEPC_intensity;
				
			}																
		
			colors.needsUpdate = true;
		}
		
		// TODO: only gets updated once cursor is off the point. .updateMatrix() doesn't help		
		
		function selectPoints(pts_intersected) {

		//console.log("select called: " + pts_intersected.length);

			var pointcloud = scene.getObjectByName( "pointcloud" );
			var colors = pointcloud.geometry.attributes.color;
			var selected = pointcloud.geometry.attributes.selected;
		
			for (var i = 0; i < pts_intersected.length; i++) {

				var id = pts_intersected[i].index;									
			
				colors.array[id*3] 	   = SelectedEventPointColor.r * SEPC_intensity;
				colors.array[id*3 + 1] = SelectedEventPointColor.g * SEPC_intensity;
				colors.array[id*3 + 2] = SelectedEventPointColor.b * SEPC_intensity;
				
				selected.array[id] = !selected.array[id];
				
			}											
		
			colors.needsUpdate = true;
			selected.needsUpdate = true;
			
		}
		
		function resetPoints() {
				
		//console.log("reset called");
		
			var pointcloud = scene.getObjectByName( "pointcloud" );
			var colors = pointcloud.geometry.attributes.color;
			var selected = pointcloud.geometry.attributes.selected;		
		
			var pc_size = pointcloud.geometry.attributes.position.length;	
									
			for (var i = 0; i < pc_size; i++) {
				
				if ( !selected.array[i] ) {						
					colors.array[i*3] 	  = EventPointColor.r * EPC_intensity;
					colors.array[i*3 + 1] = EventPointColor.g * EPC_intensity;
					colors.array[i*3 + 2] = EventPointColor.b * EPC_intensity;					
				}				
				// leave selected colour for previously selected points	
				else {					
					colors.array[i*3] 	  = SelectedEventPointColor.r * SEPC_intensity;
					colors.array[i*3 + 1] = SelectedEventPointColor.g * SEPC_intensity;
					colors.array[i*3 + 2] = SelectedEventPointColor.b * SEPC_intensity;				
				}
			
			}
			
			colors.needsUpdate = true;
			
		}
		

		
        function animate() {
        
            requestAnimationFrame(animate);

            render();		
            stats.update();
            controls.update();
            updateTimers();   
     
        }
        
        
        var timerx = Date.now() * 0.0002;
        var timerz = timerx;
        var offsetx = 0, offsetz = 0;
        
        // save the current camera position
        // TODO: take user controls under consideration
        function updateTimers() {
        	timerx = Math.acos( (camera.position.x - 0.5) / 2);
			timerz = Math.asin( (camera.position.z) / 2);
			offsetx = Date.now() * 0.0002 - timerx;
			offsetz = Date.now() * 0.0002 - timerz;
		}
        
		function toggleAnimation() {
			updateTimers();		
			rotate = !rotate;
		}
		
		
		
		
        function render() {
			if (rotate) {
				//better way to do this?
	            //timerx += 0.01;
    	        //timerz += 0.01;
    	        timerx = Date.now() * 0.0002 - offsetx;
    	        timerz = Date.now() * 0.0002 - offsetz;
    	        camera.position.x = 0.5 + Math.cos(timerx) * 2;
    	        camera.position.z = Math.sin(timerz) * 2;
			}

            camera.lookAt(cameraTarget);
            //camera.lookAt(getCenter());
            


            // interaction - find intersections

			raycaster.setFromCamera( mouse, camera );
			raycaster.params.PointCloud.threshold = 0.05;

			var intersects = raycaster.intersectObjects( scene.children );						

			if ( intersects.length > 0) {
				
				var pts_intersected = [], meshes_intersected = [];

				intersects.forEach( function(inter) {
						if (inter.object.name === "pointcloud") pts_intersected.push(inter);
						if (inter.object.name === "problem_mesh") meshes_intersected.push(inter);
					});
					
				mesh_intersected = meshes_intersected[0];
			
			
				// points intersection
				
				if (pts_intersected.length > 0) {

					if ( INTERSECTED_POINTS != pts_intersected ) {

						if ( INTERSECTED_POINTS ) { resetPoints(); }

						INTERSECTED_POINTS = pts_intersected;
						highlightPoints(INTERSECTED_POINTS);
					}						
				}
				
				else {		// no points selected
				
					INTERSECTED_POINTS = null;
					resetPoints();
					
				}
				
				
				// meshes intersection
				
				if (mesh_intersected) {				
				
					var id = mesh_intersected.object.realId;

					if ( INTERSECTED != mesh_intersected.object ) {

						if ( INTERSECTED ) INTERSECTED.material = prevMaterial;

						INTERSECTED = mesh_intersected.object;
						prevMaterial = INTERSECTED.material;
						INTERSECTED.material = HoverMaterial;
					}
				}
				else {		// no mesh intersected
		
					if ( INTERSECTED ) INTERSECTED.material = prevMaterial;
					INTERSECTED = null;
			
				}	
			}
			
			else {		// nothing intersected
		
				if ( INTERSECTED ) INTERSECTED.material = prevMaterial;
				INTERSECTED = null;
				INTERSECTED_POINTS = null;
			
			}						
				
            renderer.render(scene, camera);
        }
        
        
        
        // load meshes
        
        function loadSTLs(aList) {
        var realId = 0;
        group = new THREE.Object3D();
            aList.forEach(function(filepath) {
				loader.load( filepath, function ( geometry ) {

                    var material = NormalMaterial;
                    var mesh = new THREE.Mesh( geometry, material );
                    
                    mesh.name = "problem_mesh";
            		
            		// keep actual id in object - instead of scene id
            		mesh.realId = realId;            		
					highlight_layers[realId] = 0;
        			realId++;
                    
                    mesh.position.set(0.0, 0.0, 0.0);
                	mesh.rotation.set(-Math.PI / 2, 0, 0);
                	//mesh.scale.set(6, 6, 6);
                	//mesh.scale.set(scale_factor, scale_factor, scale_factor);
                	//mesh.scale.set(1, 1, 1);
                	
                	mesh.castShadow = true;
            		//mesh.receiveShadow = true;            		                    
                    
                    
                    // add mesh to group, update group geometry                    
                    group.add(mesh);                    
                    mesh.updateMatrix();
                    if (mesh.realId === 0) {
                    	groupGeometry = mesh.geometry.clone();
                    }
                    else {
                    	groupGeometry.merge(mesh.geometry, mesh.matrix);
                    }
                     
                     
                    meshes.push(mesh); 
                    scene.add(mesh);    
                    
                } );
             } );             
         }

		function removeSTLs(){
		    meshes.forEach(function(mesh){ scene.remove(mesh);});
		}



		function updateGLview() {
			camera.aspect = window.GLwindowWidth / (window.GLwindowHeight);
			camera.updateProjectionMatrix();
			renderer.setSize(window.GLwindowWidth, window.GLwindowHeight);
		}
