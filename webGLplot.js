// WebGL window

        if (!Detector.webgl) Detector.addGetWebGLMessage();

        var container, stats, controls;
        var rotate = false;
        var raycaster, mouse = new THREE.Vector2(), INTERSECTED;
        var prevMaterial;

        var camera, cameraTarget, scene, renderer;
        var scale_factor = 6;
        
        var select_neighbours = false;
        highlight_layers = [];		// number of selections that cause highlighting for each mesh
        selected_subdomains = [];	// index=subdomain. 1 if selected, 0 if not
        
        var groupGeometry = null;
        var positions = [], xhr, pcBuffer;

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
            camera.position.set(1.5, 0.45, 1.5);
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

		function getPositions(response) {

			var x, y, z;
			var content = response.split("\n");
			
			for (var line = 0; line < content.length; line++) {
				
				//get the last three numbers on this line
				var xyz = content[line].split(" ").filter(
					function(element) {
						if (element === "0.000000E+00") return true;
						return Number(element);
					}).splice(-3);
				
				if (xyz != "") {
					x = xyz[0];
					y = xyz[1];
					z = xyz[2];
			
					positions.push(x);
					positions.push(y);
				   	positions.push(z);
				}
			}
				
			positions = positions.map(parseFloat);
		}

		function sendRequest(url, xhr) {
		
			xhr.onload = function () {	};
			xhr.open('GET', url);
			xhr.onreadystatechange = clientSideUpdate;
			xhr.send();
		}

		function clientSideUpdate() {

			if (xhr.readyState === 4 && positions) {
		
				getPositions(this.responseText);
				
				//TODO: do this once meshes are actually loaded...
				setTimeout( function() {	
							
					pcBuffer = generatePointcloud( new THREE.Color( 1, 1, 0 ), positions);

					pcBuffer.position.set( 0, 0, 0 );			
									
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
			var intensity = 1;

			var geometry = new THREE.BufferGeometry();

			//an array of size just numPoints creates weird errors...?
			//var indices = new Float32Array( numPoints );
			var indices = new Float32Array( numPoints*3 );
			var positions_relative = new Float32Array( numPoints*3 );
			var colors = new Float32Array( numPoints*3 );			
			
			for (var i = 0; i < numPoints; i++) {
				
				//indices[ i ] = i;
				//indices[ 3*i ] = indices[ 3*i+1 ] = indices[ 3*i+2 ] = i;
				indices[ 3*i ] = i;
				indices[ 3*i+1 ] = i;
				indices[ 3*i+2 ] = i;
				
				var pt = new THREE.Vector3(positions[3*i], positions[3*i+1], positions[3*i+2]);
				var pt_relative_pos = getRelativePosition(pt);
				positions_relative[ 3*i ] 	= pt_relative_pos.x;
				positions_relative[ 3*i+1 ] = pt_relative_pos.y;
				positions_relative[ 3*i+2 ] = pt_relative_pos.z;			
						
				colors[ 3*i ] 	= color.r * intensity;
				colors[ 3*i+1 ] = color.g * intensity;
				colors[ 3*i+2 ] = color.b * intensity;				
				
				//TEST: points along diagonal
				/*positions_relative[ 3*i ] = i/9;
				positions_relative[ 3*i+1 ] = i/5;
				positions_relative[ 3*i+2 ] = 0;*/
				
				//console.log(i + " " + pt.x + " " + pt.y + " " + pt.z);
				//console.log(i + " " + pt_relative_pos.x + " " + pt_relative_pos.y + " " + pt_relative_pos.z);
			}
			
			//TEST: first point's in blue
			var c = new THREE.Color(0x0000ff);
			colors[0] = c.r * intensity;
			colors[1] = c.g * intensity;
			colors[2] = c.b * intensity;
			
			geometry.addAttribute( 'position', new THREE.BufferAttribute( positions_relative, 3 ) );
			geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );	
			//geometry.addAttribute( 'point_id', new THREE.BufferAttribute( indices, 1 ) );		
			geometry.addAttribute( 'point_id', new THREE.BufferAttribute( indices, 3 ) );
			
			geometry.computeBoundingBox();

			return geometry;

		}
	
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
			intersectsClick = raycasterClick.intersectObjects( scene.children );
			
			if ( intersectsClick.length > 0 ) {
			
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
			var intersects = raycaster.intersectObjects( scene.children );
				
			// points intersection

			if ( intersects.length > 0 && intersects[0].object.name === "pointcloud") {
				//console.log(intersects[0].object.geometry.attributes.point_id.array);
				//console.log(intersects[0].object.geometry.getAttribute("point_id")[0]);
				//console.log(intersects[0].object.geometry);
				//console.log(intersects);
				
				var pts_intersected = intersects.filter( function (inter) {
						if (inter.object.name === "pointcloud") return true;
						return false;
					});
				
				//console.log(intersects.length + " vs " + pts_intersected.length);
				
				var pointcloud = intersects[0].object;
				var colors = pointcloud.geometry.attributes.color;
				
				var ids = "";
				
				for (var i = 0; i < pts_intersected.length; i++) {

					var id = pts_intersected[i].index;
					
					ids += id + " ";
					
					colors.array[id*3] 	   = 255;
					colors.array[id*3 + 1] = 255;
					colors.array[id*3 + 2] = 255;				
					
				}
				
				//console.log(ids);
				
				//console.log(pts_intersected.length);
				
				colors.needsUpdate = true;
				
			}
			
			// meshes intersection
			// TODO: mesh is not in 0 if there is a pointcloud on top (all pts included)
				
			if ( intersects.length > 0 && intersects[0].object.name === "problem_mesh") {
				
				var id = intersects[ 0 ].object.realId;

				if ( INTERSECTED != intersects[ 0 ].object ) {

					if ( INTERSECTED ) INTERSECTED.material = prevMaterial;

					INTERSECTED = intersects[ 0 ].object;
					prevMaterial = INTERSECTED.material;
					INTERSECTED.material = HoverMaterial;
				}
			}
			else {
			
				if ( INTERSECTED ) INTERSECTED.material = prevMaterial;
				INTERSECTED = null;
				
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
