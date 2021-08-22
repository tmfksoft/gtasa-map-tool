import React, { useCallback, useState, useImperativeHandle, forwardRef } from 'react';

import { MapContainer, TileLayer, useMapEvents, Polygon } from 'react-leaflet';
import { CRS, DragEndEvent, Icon, LatLng, LeafletMouseEvent, Map } from 'leaflet';
import MapMarker from '../interfaces/MapMarker';
import polygonColours from '../Polygons';
import DraggableMarker from '../components/DraggableMarker';

interface MappedPropertyProps {
	style?: React.CSSProperties,
	zoomLevel?: number,

	mapCenter?: {
		x: number,
		y: number,
	}

	markers: MapMarker[],
	onClick: (e: LeafletMouseEvent) => void
	onMarkerClick: (e: LeafletMouseEvent, markerId: number) => void,
	onMarkerDragged: (e: DragEndEvent, markerId: number, latlng: LatLng) => void,

	showMarkers: boolean,
	showPolygons: boolean,
	showPolygonMarkers: boolean,
}

interface MapEventsProps {
	clickHandler: (e: LeafletMouseEvent) => void,
}
function MapEvents(props: MapEventsProps) {
	useMapEvents({
		click: props.clickHandler,
	});
	return (<></>);
}

interface PageState {
	mapCenter: {
		x: number,
		y: number,
	},
	map: Map | null,
}

function MappedProperty(props: MappedPropertyProps, ref: any) {
	const [ state, setState ] = useState<PageState>({
		mapCenter: {
			x: 0,
			y: 0,
		},
		map: null,
	});

	useImperativeHandle(ref, () => ({
		flyTo: (x: number, y: number, zoom?: number) => {
			if (state.map) {
				const coords = mapCoords(x, y);
				let currentZoom = state.map.getZoom();
				state.map.flyTo({
					lat: coords[0],
					lng: coords[1],
				}, (zoom || currentZoom) );
			}
		},
		getZoom: () => {
			if (state.map) {
				return state.map.getZoom();
			}
			return 0;
		},
		setZoom: (zoom: number) => {
			if (state.map) {
				state.map.setZoom(zoom);
			}
		}
	}));

	/* This should probably just abuse CDN */
	const iconRepo: Icon[] = [];
	for (let i=0; i<=63; i++) {
		iconRepo.push(new Icon({
			iconUrl: "https://properties.mikescnr.com/api/marker/" + i,
			iconSize: [ 30, 30 ],
		}));
	}

	const numberMap = (num: number, in_min: number, in_max: number, out_min: number, out_max: number): number => {
		return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	}

	const mapCoords = useCallback((x: number, y: number): [ number, number ] => {
		return [
			numberMap(y, -3000, 3000, -192, 0),
			numberMap(x, -3000, 3000, 0, 192),
		];
	}, []);

	const centerMap = () => {
		if (props.mapCenter) {
			const mappedCoords = [ props.mapCenter.x, props.mapCenter.y];
			if (state.map) {
				const coords = mapCoords(mappedCoords[0], mappedCoords[1]);
				state.map.flyTo({
					lat: coords[0],
					lng: coords[1],
				});
			}
			setState(s => ({
				...s,
				mapCenter: {
					x: mappedCoords[0],
					y: mappedCoords[1],
				}
			}));
		}
	}

	return(
		<MapContainer
			style={{ backgroundColor:"#007A9D", ...props.style }}
			center={mapCoords(state.mapCenter.x, state.mapCenter.y)}
			zoom={(props.zoomLevel || 5)}
			worldCopyJump={false}
			maxZoom={7}
			minZoom={0}
			crs={CRS.Simple}
			bounds={[ [0, 0], [-212, 212] ]}
			/* maxBounds={[ [0, 0], [-212, 212] ]} */
			tap={false}

			whenCreated={map => {
				setState(s => ( { ...s, map } ));
			}}
		>
			<MapEvents clickHandler={props.onClick} />
			<TileLayer
				attribution='&copy; <a href="https://mikescnr.com">Mike&#39;s Cops and Robbers</a>'
				url="https://storage.burnett-taylor.me/gtasa-map/tiles/{z}/{x}/{y}.jpg"
			/>

			{props.showMarkers && props.markers.map( (loc, ind) => {
				if (!props.showPolygonMarkers) {
					if (loc.polygon && loc.polygon > 0) {
						return <></>;
					}
				}
				return (
					<DraggableMarker
						draggable={true}
						onClick={(e)=> props.onMarkerClick(e, ind)}
						onDragEnd={(e, latlng) => props.onMarkerDragged(e, ind, latlng)}
						riseOnHover
						icon={iconRepo[loc.icon]}
						position={mapCoords(loc.x, loc.y)} 
						key={ind}
					/>
				);
			})}

			{props.showPolygons && polygonColours.map( (polygonColour, polygonId) => {
				if (polygonId === 0) {
					return <></>;
				}

				let markers = [];
				for (let m of  props.markers) {
					if (!m.polygon) continue;

					if (m.polygon === polygonId) {
						markers.push(mapCoords(m.x, m.y));
					}
				}

				return <Polygon positions={markers} color={polygonColour.split(" ")[0]}/>
			})}

		</MapContainer>
	);
}

export default forwardRef(MappedProperty);