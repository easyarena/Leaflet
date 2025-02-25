import {Layer} from '../Layer';
import * as DomUtil from '../../dom/DomUtil';
import * as Util from '../../core/Util';
import {Bounds} from '../../geometry/Bounds';



/*
 * @class Renderer
 * @inherits Layer
 * @aka L.Renderer
 *
 * Base class for vector renderer implementations (`SVG`, `Canvas`). Handles the
 * DOM container of the renderer, its bounds, and its zoom animation.
 *
 * A `Renderer` works as an implicit layer group for all `Path`s - the renderer
 * itself can be added or removed to the map. All paths use a renderer, which can
 * be implicit (the map will decide the type of renderer and use it automatically)
 * or explicit (using the [`renderer`](#path-renderer) option of the path).
 *
 * Do not use this class directly, use `SVG` and `Canvas` instead.
 *
 * @event update: Event
 * Fired when the renderer updates its bounds, center and zoom, for example when
 * its map has moved
 */

export const Renderer = Layer.extend({

	// @section
	// @aka Renderer options
	options: {
		// @option padding: Number = 0.1
		// How much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction
		padding: 0.1
	},

	initialize(options) {
		Util.setOptions(this, options);
		Util.stamp(this);
		this._layers = this._layers || {};
	},

	onAdd() {
		if (!this._container) {
			this._initContainer(); // defined by renderer implementations

			// always keep transform-origin as 0 0
			this._container.classList.add('leaflet-zoom-animated');
		}

		this.getPane().appendChild(this._container);
		this._update();
		this.on('update', this._updatePaths, this);
	},

	onRemove() {
		this.off('update', this._updatePaths, this);
		this._destroyContainer();
	},

	getEvents() {
		const events = {
			viewreset: this._reset,
			zoom: this._onZoom,
			moveend: this._update,
			zoomend: this._onZoomEnd
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._onAnimZoom;
		}
		return events;
	},

	_onAnimZoom(ev) {
		this._updateTransform(ev.center, ev.zoom);
	},

	_onZoom() {
		this._updateTransform(this._map.getCenter(), this._map.getZoom());
	},

	_updateTransform(center, zoom) {
		const scale = this._map.getZoomScale(zoom, this._zoom),
		    viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
		    currentCenterPoint = this._map.project(this._center, zoom),

		    topLeftOffset = viewHalf.multiplyBy(-scale).add(currentCenterPoint)
				  .subtract(this._map._getNewPixelOrigin(center, zoom));

		DomUtil.setTransform(this._container, topLeftOffset, scale);
	},

	_reset() {
		this._update();
		this._updateTransform(this._center, this._zoom);

		for (const id in this._layers) {
			this._layers[id]._reset();
		}
	},

	_onZoomEnd() {
		for (const id in this._layers) {
			this._layers[id]._project();
		}
	},

	_updatePaths() {
		for (const id in this._layers) {
			this._layers[id]._update();
		}
	},

	_update() {
		// Update pixel bounds of renderer container (for positioning/sizing/clipping later)
		// Subclasses are responsible of firing the 'update' event.
		const p = this.options.padding,
		    size = this._map.getSize(),
		    min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

		this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());

		this._center = this._map.getCenter();
		this._zoom = this._map.getZoom();
	}
});
