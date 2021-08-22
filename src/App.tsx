import { LeafletMouseEvent } from 'leaflet';
import React, { useCallback } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import './App.css';
import MappedProperty from './components/MappedProperty';
import MapMarker from './interfaces/MapMarker';
import polygonColours from './Polygons';
import mapIcons from './MapIcons';
import { useRef } from 'react';

const PageContainer = styled.div`
	display: flex;
	width: 100vw;
	height: 100vh;
	position: fixed;
	left: 0;
	top: 0;
	flex-direction: row;
	background-color: black;

	table {
		border-spacing: 0;
		td {
			padding: 2px;
			text-align: center;
		}
		th {
			text-align: center;
		}
	}
`;
const SideBar = styled.div`
	min-width: 400px;
	background-color: #111;
	padding: 10px;
	color: white;
	overflow-y: auto;
	h3 {
		text-align: center;
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

interface PageState {
	markers: MapMarker[],
	lastPolygonColour: 0,
	focusedMarker: number,

	showImport: boolean,
	importContents: string,

	exportContents: string,
}

function App() {
	const mapRef = useRef<{
		flyTo: (x: number, y: number) => void,
	}>();

	const [ state, setState ] = useState<PageState>({
		lastPolygonColour: 0,
		markers: [],
		focusedMarker: -1,

		showImport: false,
		importContents: "",
		exportContents: "",
	});

	const mapClick = (e: LeafletMouseEvent) => {
		const mapped = mapCoords(e.latlng.lat, e.latlng.lng);
		console.log("Map Click", e);

		setState(s => {

			let lastColour = 0;
			const lastMarker = s.markers[s.markers.length - 1];
			if (lastMarker && lastMarker.polygon) {
				lastColour = lastMarker.polygon;
			}

			return {
				...s,
				markers: [
					...s.markers,
					{
						...mapped,
						icon: 41,
						polygon: lastColour,
					}
				],
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
				...s.markers.map( m => Object.values(m).join(',')),
			].join('\n'),
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

			setState(s => ({
				...s,
				markers: newMarkers,
				showImport: false,
				importContents: "",
			}));

			alert(`Imported ${(json.length - failed)}/${json.length} markers. Check console for any failed imports.`);
			
		} catch (e) {
			console.log(e);
			alert("Unable to parse the JSON!")
		}
	}

	return (
		<PageContainer>
			<MappedProperty
				markers={state.markers}
				onClick={mapClick}
				onMarkerClick={markerClick}
				style={{
					flex: 1,
				}}
				ref={mapRef}
			/>
			<SideBar>
				<button onClick={exportJson}>JSON Export</button>
				<button onClick={exportList}>List Export</button>
				<button onClick={()=>{
					setState(s => ({
						...s,
						showImport: true,
						importContents: "",
					}));
				}}>JSON Import</button>
				<h3>Map Markers</h3>
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
								<th>{ind}</th>
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
								<td onClick={()=>{ flyToMarker(ind); }}>{m.y.toFixed(2)}</td>
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
									<button onClick={() => deleteMarker(ind)}>X</button>
								</td>
							</tr>
						);
					})}
				</table>
			</SideBar>
			{state.exportContents && <ExportDialog>
				<h1>Data Export</h1>
				<textarea value={state.exportContents}/>
				<div>
					<button onClick={() => setState(s => ({ ...s, exportContents: ""}))}>Close</button>
				</div>
			</ExportDialog>}
			{state.showImport && <ExportDialog>
				<h1>Data Import (JSON)</h1>
				<textarea value={state.importContents} onChange={e => {
					setState(s => ({
						...s,
						importContents: e.target.value
					}));
				}}/>
				<div>
					<button onClick={() => importJson(state.importContents)}>Import</button>
					<button onClick={() => setState(s => ({ ...s, showImport: false, importContents: "" }))}>Cancel</button>
				</div>
			</ExportDialog>}
		</PageContainer>
	);
}

export default App;
