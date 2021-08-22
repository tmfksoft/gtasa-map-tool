import { DragEndEvent, LatLng, LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';
import React, { useRef } from 'react';
import { Marker, MarkerProps } from 'react-leaflet';

interface DraggableMarkerProps extends MarkerProps {
	onDragEnd: (e: DragEndEvent, latlng: LatLng) => void,
	onClick: (e: LeafletMouseEvent) => void,
}

export default function DraggableMarker( props: DraggableMarkerProps) {
	const markerRef = useRef<any>();

	const dragEnd = (e: DragEndEvent) => {
		if (markerRef.current) {
			const marker = markerRef.current as LeafletMarker;
			const latlng = marker.getLatLng();
			props.onDragEnd(e, latlng);
		}
	}

	return <Marker
		{...props}
		ref={markerRef}
		eventHandlers={{
		click: props.onClick,
		dragend: dragEnd,
	}} />
}