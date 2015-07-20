 // WebGL window

        if (!Detector.webgl) Detector.addGetWebGLMessage();

        var container, stats, controls;
        var animation, rotate = false;
        var raycaster, mouse = new THREE.Vector2(), INTERSECTED;
        var prevMaterial;

        var camera, cameraTarget, scene, renderer;
        
        var select_neighbours = true;
        highlight_layers = []; 	//number of selections that cause highlighting for each mesh
        selected_subdomains = [];	//index=subdomain. 1 if selected, 0 if not

        init();
        animate();

        function init() {

            cont = d3.selectAll("#threeDplot"); //document.createElement('div');container
            container = cont[0][0]; // dirty trick to get the DOM element
            //document.body.appendChild(container);

            window.GLwindowHeight = window.innerHeight-window.d3windowHeight;
        window.GLwindowWidth

            camera = new THREE.PerspectiveCamera(35, window.GLwindowWidth / (window.GLwindowHeight ), 1, 15);
            camera.position.set(3, 0.15, 3);
            cameraTarget = new THREE.Vector3(0, -0.25, 0);

            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x72645b, 2, 15);


            // Ground

            var plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhongMaterial({
            //var plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(40, 40), new THREE.MeshPhongMaterial({
                ambient: 0x999999,
                color: 0x999999,
                specular: 0x1F1F1F
            }));
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = -0.5;
            //with receiveShadow it doesn't show; without it you can't see the cylinder
            //scene.add(plane);

            //plane.receiveShadow = true;

            //var material = new THREE.MeshPhongMaterial( { ambient: 0x555555, color: 0xAAAAAA, specular: 0x111111, shininess: 200 } );
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
            


            // Lights

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
            // directionalLight.shadowCameraVisible = true;

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
	
	
	
		//interaction with separate meshes
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
			vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(camera);
			raycasterClick = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize() );
			intersectsClick = raycasterClick.intersectObjects(scene.children);
			
			if (intersectsClick.length > 0) {
			
				selected_id = intersectsClick[0].object.realId;		
	
				//doAllSelections(selected_id);
				
				if (prevMaterial != HighlightMaterial) {
					selectSubdomain(selected_id);
				}
				else {
					deselectSubdomain(selected_id);
				}

				updateDetails();
			}

		}
		
		function selectSubdomain(selected_id) {

			//select neighbours
			if (select_neighbours) {
				
				link_data[selected_id].forEach( function(id){
					
					highlight_layers[id]++;
							
					//don't make opaque if already selected
					if (meshes[id].material != HighlightMaterial) {		

						selectMesh(id, HighlightMaterialOpaque);
						
						selectNode(id, "node_neighbour");	
					}
				});
			}
										
			//select this subdomain
			selectMesh(selected_id);					
					
			selectNode(selected_id);
			
			selected_subdomains[selected_id] = 1;
		
		}
		
		function deselectSubdomain (selected_id) {
					
			//deselect neighbours
			if (select_neighbours) {

				link_data[selected_id].forEach( function(id){
						
					highlight_layers[id]--;				
										
					//don't deselect if already selected, or if highlighted by another selection
					if (meshes[id].material != HighlightMaterial && highlight_layers[id] === 0) {
						deselectMesh(id);
								
						deselectNode(id);
					}
				});
			}
					
			//deselect this subdomain
			if (highlight_layers[selected_id] === 0) {

				deselectMesh(selected_id);
						
				deselectNode(selected_id);	
						
			}
			else {
											
				prevMaterial = HighlightMaterialOpaque;
				//debugger;
				selectMesh(selected_id, HighlightMaterialOpaque);	
						
				deselectNode(selected_id);
				selectNode(selected_id, "node_neighbour");			
			}	
						
			selected_subdomains[selected_id] = 0;											
		
		}
		
		function deselectAll() {
			
			for (var i=0; i<selected_subdomains.length; i++) {
				if (selected_subdomains[i]) {
				
					deselectSubdomain(i);
					
				}
			}
			
		}

		function deselectMesh(id) {
	                   	 	
	        meshes[id].material = NormalMaterial;
			prevMaterial = NormalMaterial;
			//debugger;
		}
        
        function selectMesh(id, material) {
   
          	if (typeof material === "undefined") {
          		material = HighlightMaterial;
          	}
          	
	        meshes[id].material = material;
	        prevMaterial = material;
			//debugger;
			
        }



        function animate() {
            animation = requestAnimationFrame(animate);

            render();
            stats.update();
            controls.update();
            updateTimers();
     
        }
        
        
        var timerx = Date.now() * 0.0002;
        var timerz = timerx;
        var offsetx = 0, offsetz = 0;
        
        //save the current camera position
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
		
		function toggleNeighbours() {

			var is_checked = false;
			
			if (document.getElementById('showNeighbours').checked) {
				is_checked = true;            	
        	} 
        
        	//update
        	var really_selected = selected_subdomains.slice();
        	deselectAll();
        	selected_subdomains = really_selected.slice();

            select_neighbours = is_checked;
            	
           	for (var i=0; i<selected_subdomains.length; i++) {
           		if (selected_subdomains[i]) {
           			selectSubdomain(i);
           		}
           	}
        	
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
            

            // interaction - find intersections

			raycaster.setFromCamera( mouse, camera );
			var intersects = raycaster.intersectObjects( scene.children );
				
			if ( intersects.length > 0 ) {
				
				var id = intersects[ 0 ].object.realId;

				if ( INTERSECTED != intersects[ 0 ].object ) {

					if ( INTERSECTED ) INTERSECTED.material = prevMaterial;

						INTERSECTED = intersects[ 0 ].object;

						prevMaterial = INTERSECTED.material;
						//debugger;
						INTERSECTED.material = HoverMaterial;

					}

				} else {

					if ( INTERSECTED ) INTERSECTED.material = prevMaterial;

					INTERSECTED = null;

				}
				
            renderer.render(scene, camera);
        }
        


        function loadSTLs(aList) {
        var realId = 0;
            aList.forEach(function(filepath) {
				loader.load( filepath, function ( geometry ) {

                    var material = NormalMaterial;
                    var mesh = new THREE.Mesh( geometry, material );
                    
                    mesh.position.set(0.0, -0.4, 0.0);
                	mesh.rotation.set(-Math.PI / 2, 0, 0);
                	mesh.scale.set(6, 6, 6);
                	
                	mesh.castShadow = true;
            		//mesh.receiveShadow = true;
            		
            		//actual id kept in object - as opposed to scene id
            		mesh.realId = realId;
            		
            		//prevMaterial.push(NormalMaterial);
					highlight_layers[realId] = 0;

        			realId++;
        			

            		meshes.push(mesh);
                    
                    scene.add( mesh );
                    
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
