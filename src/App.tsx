import { LatLng, LeafletMouseEvent } from 'leaflet';
import React, { useCallback, useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import './App.css';
import GameMap from './components/GameMap';
import MapMarker from './interfaces/MapMarker';
import polygonColours from './Polygons';
import mapIcons from './MapIcons';
import { useRef } from 'react';
import defaultMarkers from './DefaultMarkers';

const PageContainer = styled.div`
	display: flex;
	width: 100vw;
	height: 100vh;
	position: fixed;
	left: 0;
	top: 0;
	flex-direction: row;
	background-color: black;

	button, select {
		font-family: inherit;
		padding: 10px 15px;
		background-color: #2D2C2A;
		color: white;
		border: none;

		transition: color linear .2s, background-color linear .2s;

		&:hover {
			background-color: #111;
			color: white;
			cursor: pointer;
		}
		&:active {
			outline: none;
		}
	}
`;
const SideBar = styled.div`
	min-width: 400px;
	background-color: #111;
	padding: 10px;
	color: white;
	overflow-y: auto;
	overflow-x: hidden;
	display: flex;
	flex-direction: column;
	h3 {
		text-align: center;
	}


	table {
		overflow-y: auto;
		overflow-x: hidden;
		border-spacing: 0;
		td {
			padding: 2px;
			text-align: center;
			cursor: pointer;
		}
		th {
			text-align: center;
		}
	}

`;

const ExportDialog = styled.div`
	width: 800px;
	height: 600px;
	background-color: #111;
	border:solid 2px white;
	border-radius: 10px;
	position: fixed;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 500;
	color: white;
	padding: 10px;
	display: flex;
	flex-direction: column;
	h1 {
		text-align: center;
	}
	textarea {
		flex: 1;
	}
`;
const ControlButtons = styled.div`
	text-align: center;
`;

interface PageState {
	markers: MapMarker[],
	lastPolygonColour: 0,
	focusedMarker: number,

	importType: 'json' | 'list',
	showImport: boolean,
	importContents: string,
	importAsPolygon: boolean,

	showMarkers: boolean,
	showPolygons: boolean,
	showPolygonMarkers: boolean,

	exportContents: string,
}

function App() {
	const mapRef = useRef<{
		flyTo: (x: number, y: number, zoom?: number) => void,
		getZoom: () => number,
		setZoom: (zoom: number) => void,
	}>();

	const [ state, setState ] = useState<PageState>({
		lastPolygonColour: 0,
		markers: [],
		focusedMarker: -1,

		showImport: false,
		importType: 'json',
		importAsPolygon: false,
		importContents: "",
		exportContents: "",

		showMarkers: true,
		showPolygons: true,
		showPolygonMarkers: true,
	});

	const keyUpListener = useCallback((ev: KeyboardEvent): any => {
		if (ev.key === "Delete") {
			deleteMarker(state.focusedMarker);
		}
	}, [ state.focusedMarker ]);

	useEffect(()=>{
		document.addEventListener("keyup", keyUpListener);
		return () => {
			document.removeEventListener("keyup", keyUpListener);
		}
	}, [ keyUpListener ]);

	const mapClick = (e: LeafletMouseEvent) => {
		const mapped = mapCoords(e.latlng.lat, e.latlng.lng);
		console.log("Map Click", e);

		setState(s => {

			let lastColour = 0;
			const lastMarker = s.markers[s.markers.length - 1];
			if (lastMarker && lastMarker.polygon) {
				lastColour = lastMarker.polygon;
			}

			let lastIcon = 41;
			if (lastMarker && lastMarker.icon) {
				lastIcon = lastMarker.icon;
			}

			const newMarkers = [
				...s.markers,
				{
					...mapped,
					icon: lastIcon,
					polygon: lastColour,
				}
			];

			const updatedMarkers = markerJoinPolygon(newMarkers.length - 1, true, 15, newMarkers);

			return {
				...s,
				markers: updatedMarkers,
				focusedMarker: (updatedMarkers.length - 1)
			};

		});
	}

	const numberMap = (num: number, in_min: number, in_max: number, out_min: number, out_max: number): number => {
		return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	}

	const mapCoords = useCallback((lat: number, lng: number): { x: number, y: number } => {
		return {
			x: numberMap(lng, 0, 192, -3000, 3000),
			y: numberMap(lat, -192, 0, -3000, 3000),
		};
	}, []);

	const setMarkerColour = (markerId: number, colourId: number) => {
		setState(s => {
			const markers = s.markers;
			if (!markers[markerId]) {
				return s;
			}
			markers[markerId].polygon = colourId;

			return {
				...s,
				markers,
			};

		});
	}

	const setMarkerIcon = (markerId: number, iconId: number) => {
		setState(s => {
			const markers = s.markers;
			if (!markers[markerId]) {
				return s;
			}
			markers[markerId].icon = iconId;

			return {
				...s,
				markers,
			};

		});
	}

	const deleteMarker = (markerId: number) => {
		setState(s => {
			const markers = [ ...s.markers ];
			markers.splice(markerId,1);

			return {
				...s,
				markers,
			};
		})
	}

	const markerClick = (e: LeafletMouseEvent, markerId: number) => {
		setState(s => ({
			...s,
			focusedMarker: markerId
		}))
	}

	const flyToMarker = (markerId: number) => {
		if (!mapRef.current) {
			return;
		}
		const marker = state.markers[markerId];
		if (!marker) {
			return;
		}
		mapRef.current.flyTo(marker.x, marker.y);
	}

	const exportJson = () => {
		if (state.markers.length <= 0) {
			alert("Nothing to export!");
			return;
		}
		setState(s => ({
			...s,
			exportContents: JSON.stringify(state.markers, null, 4)
		}));
	}
	const exportList = () => {
		if (state.markers.length <= 0) {
			alert("Nothing to export!");
			return;
		}
		setState(s => ({
			...s,
			exportContents: [
				Object.keys(s.markers[0]),
				...s.markers.map( m => Object.values(m).map( v => {
					if (!isNaN(v)) {
						if ( ((v as number) * 10.0) % 10 !== 0 ){
							return (v as number).toFixed(2);
						}
					}
					return v;
				}).join(',')),
			].join('\n'),
		}));
	}
	const doImport = () => {
		if (state.importType === 'json') {
			importJson(state.importContents);
		} else {
			importList(state.importContents);
		}
		setState(s => ({
			...s,
			showImport: false,
			importContents: "",
			importAsPolygon: false,
		}));
	}
	const importJson = (contents: string) => {
		try {
			let json = JSON.parse(contents);
			if (!Array.isArray(json)) {
				alert("You must supply a LIST of coords!");
				return;
			}

			let newMarkers: MapMarker[] = [];
			let failed = 0;

			for (let m of json) {
				if (typeof m.x === "undefined") {
					console.log("MISSING X", m);
					failed++;
					continue;
				}
				if (typeof m.y === "undefined") {
					console.log("MISSING Y", m);
					failed++;
					continue;
				}

				let newMarker: {
					x: number,
					y: number,
					icon?: number,
					polygon?: number,
				} = {
					x: parseFloat(m.x),
					y: parseFloat(m.y),
				};

				if (typeof m.icon !== "undefined") {
					newMarker.icon = parseInt(m.icon);
				}
				if (typeof m.polygon !== "undefined") {
					newMarker.polygon = parseInt(m.polygon);
				}

				newMarkers.push({
					x: newMarker.x,
					y: newMarker.y,

					icon: newMarker.icon || 41,
					polygon: newMarker.polygon || 0,
				});
			}

			if (state.importAsPolygon) {
				let lastPolygon = 1;
				for (let m of state.markers) {
					if (m.polygon && m.polygon > 0) {
						lastPolygon = m.polygon;
					}
				}
				for (let m of newMarkers) {
					m.polygon = lastPolygon + 1;
				}
				newMarkers = [
					...state.markers,
					...newMarkers,
				]
			}

			setState(s => ({
				...s,
				markers: newMarkers,
			}));

			alert(`Imported ${(json.length - failed)}/${json.length} markers. Check console for any failed imports.`);
			
		} catch (e) {
			console.log(e);
			alert("Unable to parse the JSON!")
		}
	}

	const markerDragged = (e: any, markerId: number, latlng: LatLng) => {
		console.log(`Marker ${markerId} was dragged to ${latlng.lat} ${latlng.lng}`);
		setState(s => {
			const markers = [...s.markers];
			if (markerId >= markers.length) {
				return s;
			}
			const mapped = mapCoords(latlng.lat, latlng.lng);
			markers[markerId].x = mapped.x;
			markers[markerId].y = mapped.y;

			const updatedMarkers = markerJoinPolygon(markerId, false, 10, markers);

			return { ...s, markers: updatedMarkers };
		});
	}

	const mapCoordsSensible = useCallback((x: number, y: number): { x: number, y: number } => {
		return {
			x: numberMap(x, -3000, 3000, 0, 6000),
			y: numberMap(y, -3000, 3000, 0, 6000),
		};
	}, []);

	const markerJoinPolygon = (markerId: number, updatePolygon: boolean, maxDistance: number = 10, suppliedMarkers?: MapMarker[]): MapMarker[] => {
		const allMarkers = (suppliedMarkers ? suppliedMarkers : [ ...state.markers ]);
		const marker = allMarkers[markerId];

		// Skip the marker if it doesn't have a polygon.
		
		if (!marker || typeof marker === "undefined") {
			return allMarkers;
		}
		if (!updatePolygon) {
			if (!marker.polygon || marker.polygon <= 0) {
				return allMarkers;
			}
		}

		const markerCoords = mapCoordsSensible(marker.x, marker.y);

		// Create a list of all markers in the same polygon.
		const polygonGroups: MapMarker[][] = [];

		for (let i=1; i<polygonColours.length; i++) {
			if (!updatePolygon) {
				if (i !== marker.polygon) {
					continue;
				}
			}

			const polygonMarkers: MapMarker[] = [];
			for (let m of allMarkers) {
				if (m.polygon === i) {
					polygonMarkers.push(m);
				}
			}
			polygonGroups.push(polygonMarkers);
		}


		for (let polygonGroup of polygonGroups) {
			for (let i = 0; i < polygonGroup.length; i++ ) {
				const thisMarker: MapMarker = polygonGroup[i];
				let nextMarker: MapMarker;

				if (thisMarker === marker) {
					continue;
				}

				// Select the first marker if we're looking at the last
				if (i === (polygonGroup.length-1)) {
					nextMarker = polygonGroup[0];
				} else {
					nextMarker = polygonGroup[i + 1];
				}

				// If the next marker is the one we're handling, skip it.
				if (nextMarker === marker) {
					if (i+2 >= polygonGroup.length) {
						nextMarker = polygonGroup[0];
					} else {
						nextMarker = polygonGroup[i + 2]
					}
				}

				const thisCoords = mapCoordsSensible(thisMarker.x, thisMarker.y);
				const nextCoords = mapCoordsSensible(nextMarker.x, nextMarker.y);
				// markerCoords
				const diffX = nextCoords.x - thisCoords.x;
				const diffY = nextCoords.y - thisCoords.y;
				const distanceBetween = Math.hypot(diffX, diffY);

				const angleDeg = Math.atan2(nextCoords.y - thisCoords.y, nextCoords.x - thisCoords.x ); // Radians
				let hit = false;

				//console.log(`Raycasting between ${thisId} and ${nextId} with a max distance of ${distanceBetween}, angle is ${angleDeg}`);

				for (let rad=0; rad<distanceBetween; rad += 10) {
					const rayCastX = rad * Math.cos(angleDeg) + thisCoords.x;
					const rayCastY = rad * Math.sin(angleDeg) + thisCoords.y;

					const distanceTo = Math.hypot( rayCastX - markerCoords.x, rayCastY - markerCoords.y );
					let currentZoom = (mapRef.current ? mapRef.current.getZoom() : 0);
					const zoomNormalised = 7 - currentZoom;

					if (distanceTo <= (maxDistance/5) * (zoomNormalised + 1)) {
						hit = true;
						break;
					}
				}
				if (hit) {
					const thisMarkerId = allMarkers.indexOf(thisMarker);
					const markersBefore = allMarkers.slice(0, thisMarkerId + 1).filter( (m) => (m !== marker));
					const markersAfter = allMarkers.slice(thisMarkerId + 1).filter( (m) => (m !== marker));

					if (updatePolygon) {
						marker.polygon = thisMarker.polygon;
						marker.icon = thisMarker.icon;
					}

					return [
						...markersBefore,
						marker,
						...markersAfter,
					];
				}
			}
		}

		return allMarkers;
	}

	const importList = (contents: string) => {
		const lines = contents.split("\n");
		let newMarkers: MapMarker[] = [];

		let lastPolygon = 0;
		for (let m of state.markers) {
			if (m.polygon && m.polygon > 0) {
				lastPolygon = m.polygon;
			}
		}
		// Increase it!
		lastPolygon++;

		for (let l of lines) {
			const ex = l.split(",");
			if (isNaN(parseFloat(ex[0]))) {
				console.log(`The first coordinate of ${l} is not numeric!`);
				continue;
			}
			if (ex.length < 2) {
				console.log(`Line "${l}" has less than 2 coordinates`);
				continue;
			}
			let polygon = 0;
			let icon = 41;

			if (ex.length >= 3) {
				if (ex[2].trim() !== "") {
					icon = parseInt(ex[2]);
				}
			}
			if (ex.length >= 4) {
				if (state.importAsPolygon) {
					console.log(`Importing as polygon with id ${lastPolygon}`);
					if (lastPolygon <= 0) {
						polygon = 1;
					} else {
						polygon = lastPolygon;
					}
				} else {
					if (ex[3].trim() !== "") {
						polygon = parseInt(ex[3]);
					}
				}
			} else if (state.importAsPolygon) {
				console.log(`Importing as polygon with id ${lastPolygon}`);
				polygon = lastPolygon;
			}
			let marker: MapMarker = {
				x: parseFloat(ex[0]),
				y: parseFloat(ex[1]),
				icon,
				polygon,
			};
			newMarkers.push(marker);
		}
		if (state.importAsPolygon) {
			setState(s => ({
				...s,
				markers: [
					...s.markers,
					...newMarkers,
				],
			}));
		} else {
			setState(s => ({
				...s,
				markers: newMarkers,
			}));
		}
		alert(`Imported (${newMarkers.length}/${lines.length}) markers, check the console for any import errors.`);
	}

	const showImport = (type: 'json' | 'list') => {
		setState(s => ({
			...s,
			showImport: true,
			importType: type,
			importContents: "",
		}));
	}

	const togglePolygonImport = () => {
		setState(s => ({
			...s,
			importAsPolygon: !s.importAsPolygon,
		}))
	}

	return (
		<PageContainer>
			<GameMap
				markers={[
					...state.markers,
				]}
				onClick={mapClick}
				onMarkerClick={markerClick}
				onMarkerDragged={markerDragged}
				style={{
					flex: 1,
				}}
				ref={mapRef}

				mapCenter={{
					x: 0,
					y: 0,
				}}

				zoomLevel={4}

				showMarkers={state.showMarkers}
				showPolygons={state.showPolygons}
				showPolygonMarkers={state.showPolygonMarkers}
			/>
			<SideBar>
				<h3>GTA:SA Map Marker Tool</h3>
				<div style={{
					textAlign: "center",
					marginBottom: "10px"
				}}
				onClick={()=>{
					console.log("Easter Egg Time!")
					setState(s => ({
						...s,
						markers: [...s.markers, ...defaultMarkers],
					}));
					if (mapRef.current) {
						mapRef.current.flyTo(
							-904.35,
							675.78,
							4
						);
					}
				}}
				>
					By Thomas Burnett-Taylor
				</div>
				<ControlButtons>
					<button onClick={exportJson}>JSON Export</button>
					<button onClick={exportList}>List Export</button>
					<button onClick={()=> showImport('json')}>JSON Import</button>
					<button onClick={() => showImport('list')}>List Import</button>
					<button onClick={() => {
						if (window.confirm("Are you sure you want to clear all markers?")) {
							setState(s => ({
								...s,
								markers: [],
							}));
						}
					}}>Clear Markers</button>
				</ControlButtons>
				<ControlButtons>
					<input type="checkbox" id="showMarkers" checked={state.showMarkers} onChange={e => {
						setState(s => ({ ...s, showMarkers: e.target.checked }))
					}}/> <label htmlFor="showMarkers">Show Markers</label>
					<br/>
					<input type="checkbox" id="showPolygons" checked={state.showPolygons} onChange={e => {
						setState(s => ({ ...s, showPolygons: e.target.checked }))
					}} /> <label htmlFor="showPolygons">Show Polygons</label>
					<input type="checkbox" id="showPolygonMarkers" checked={state.showPolygonMarkers} onChange={e => {
						setState(s => ({ ...s, showPolygonMarkers: e.target.checked }))
					}} /> <label htmlFor="showPolygonMarkers">Show Polygon Markers</label>
				</ControlButtons>
				<h3>Map Markers</h3>
				<div style={{
					overflowY: "auto",
					overflowX: "hidden",
					flex: 1,
				}}>
					<table style={{ width: "100%" }}>
						<thead>
							<tr>
								<th>ID</th>
								<th>Icon</th>
								<th>X</th>
								<th>Y</th>
								<th>Polygon</th>
								<th></th>
							</tr>
						</thead>
						{state.markers.map( (m, ind) => {
							return (
								<tr style={{
									backgroundColor: (ind === state.focusedMarker ? "red" : "initial")
								}} key={ind}>
									<td onClick={()=>{
										flyToMarker(ind);
										setState(s => ({ ...s, focusedMarker: ind }));
									}}>{ind}</td>
									<td>
										<select onChange={(e) => {
											setMarkerIcon(ind, parseInt(e.target.value));
										}}>
											{mapIcons.map( (c, ind) => {
												return <option selected={m.icon === ind} value={ind} key={ind} >{c}</option>
											})}
										</select>
									</td>
									<td onClick={()=>{
										flyToMarker(ind);
										setState(s => ({ ...s, focusedMarker: ind }));
									}}>{m.x.toFixed(2)}</td>
									<td onClick={()=>{
										flyToMarker(ind);
										setState(s => ({ ...s, focusedMarker: ind }));
									}}>{m.y.toFixed(2)}</td>
									<td>
										<select onChange={(e) => {
											setMarkerColour(ind, parseInt(e.target.value));
										}}>
											{polygonColours.map( (c, ind) => {
												return <option selected={m.polygon === ind} value={ind} key={ind} >{c}</option>
											})}
										</select>
									</td>
									<td>
										<button onClick={() => deleteMarker(ind)}>&times;</button>
									</td>
								</tr>
							);
						})}
					</table>
				</div>
			</SideBar>
			{state.exportContents && <ExportDialog>
				<h1>Data Export</h1>
				<textarea value={state.exportContents}/>
				<div>
					<button onClick={() => setState(s => ({ ...s, exportContents: ""}))}>Close</button>
				</div>
			</ExportDialog>}
			{state.showImport && <ExportDialog>
				<h1>Data Import ({(state.importType === 'json' ? "JSON" : "List")})</h1>
				<textarea value={state.importContents} onChange={e => {
					setState(s => ({
						...s,
						importContents: e.target.value
					}));
				}}/>
				<div>
					<button onClick={doImport}>Import</button>
					<button onClick={() => setState(s => ({ ...s, showImport: false, importContents: "" }))}>Cancel</button>
					<input type="checkbox" id="importAsPolygon" checked={state.importAsPolygon} onChange={() => togglePolygonImport()}/> <label htmlFor="importAsPolygon">Import as additional polygon</label>
				</div>
			</ExportDialog>}
		</PageContainer>
	);
}

export default App;
