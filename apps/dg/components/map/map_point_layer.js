// ==========================================================================
//                        DG.MapPointLayer
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

sc_require('components/graph_map_common/plot_layer');

/** @class DG.MapPointLayer - A plot of dots placed according to numeric values

 @extends DG.PlotLayer
 */
DG.MapPointLayer = DG.PlotLayer.extend(
    /** @scope DG.MapPointLayer.prototype */
    {
      autoDestroyProperties: [],

  /**
   * @property {DG.MapModel}
   */
  model: null,

  mapSource: null,

      map: function () {
        return this.getPath('mapSource.mapLayer.map');
      }.property(),

      isInMarqueeMode: false, // Set by parent during marquee select to allow us to suppress data tips

      init: function () {
        sc_super();
        this.setPath('dataTip.showOnlyLegendData', true);
      },

      /**
       * Augment my base class by checking to make sure we have the attributes we need.
       * @returns {boolean}
       */
      readyToDraw: function () {
        var tModel = this.get('model');
        return tModel && !SC.none(tModel.getPath('dataConfiguration.yAttributeDescription.attributeID')) &&
            !SC.none(tModel.getPath('dataConfiguration.xAttributeDescription.attributeID'));
      },

      /**
       * Computing this context once at beginning of display loop speeds things up
       * @return {*}
       */
      createRenderContext: function () {
        var tModel = this.get('model');
        if (!tModel)
          return; // not ready yet
        var tConfig = tModel.get('dataConfiguration'),
            tLegendDesc = tModel.getPath('dataConfiguration.legendAttributeDescription'),
            tLegendVarID = tLegendDesc && tLegendDesc.get('attributeID'),
            tStrokeParams = this.getStrokeParams(),
            tQuantileValues = (tLegendDesc && tLegendDesc.get('isNumeric')) ?
                DG.MathUtilities.nQuantileValues(
                    tConfig.numericValuesForPlace(DG.GraphTypes.EPlace.eLegend), 5) :
                [];
        return {
          // render needs (set all to true for now, maybe later we can optimize by not doing all of them?)
          casesAdded: true,
          casesRemoved: true,
          updatedColors: true,

          map: this.get('map'),
          westBound: this.get('map').getBounds().getWest(),
          eastBound: this.get('map').getBounds().getEast(),
          latVarID: tModel.getPath('dataConfiguration.latAttributeID'),
          longVarID: tModel.getPath('dataConfiguration.longAttributeID'),
          legendDesc: tLegendDesc,
          legendVarID: tLegendVarID,
          updatedPositions: true,
          pointsShouldBeVisible: this.getPath('model.pointsShouldBeVisible'),

          pointColor: tModel.get('pointColor') || DG.PlotUtilities.kDefaultPointColor,
          strokeColor: tStrokeParams.strokeColor,
          transparency: tModel.get('transparency') || DG.PlotUtilities.kDefaultPointOpacity,
          strokeTransparency: tStrokeParams.strokeTransparency,

          calcCaseColorString: function (iCase) {
            if (!this.legendVarID)
              return this.pointColor;

            DG.assert(iCase);
            var tColorValue = iCase.getValue(this.legendVarID),
                tCaseColor = DG.ColorUtilities.calcCaseColor(tColorValue, this.legendDesc,
                    this.pointColor, tQuantileValues);
            return tCaseColor.colorString || tCaseColor;
          }
        };
      },

      /**
       Observation function called when data values change.
       Method name is legacy artifact of SproutCore range observer implementation.
       */
      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        if (!this.readyToDraw())
          return;

        var this_ = this,
            tPlotElementLength = this.get('plottedElements').length,
            tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),
            // iChanges can be a single index or an array of indices
            tChanges = (SC.typeOf(iChanges) === SC.T_NUMBER ? [iChanges] : iChanges);
        tChanges = tChanges || [];
        tChanges.forEach(function (iIndex) {
          if (iIndex >= tPlotElementLength)
            this_.callCreateElement(tCases.at(iIndex), iIndex, this_._createAnimationOn);
          this_.setCircleCoordinate(tRC, tCases.at(iIndex), iIndex);
        });

        sc_super();
      },

      /**
       * Override base class because we don't want to set this flag if we don't have
       * both lat and long attributes.
       */
      caseOrderDidChange: function () {
        if (!SC.none(this.getPath('model.dataConfiguration.latAttributeID') &&
            !SC.none(this.getPath('model.dataConfiguration.longVarID'))))
          this._mustMoveElementsToNewCoordinates = true;
      },

      /**
       * Set the coordinates and other attributes of the case circle (a Raphael element in this.get('plottedElements')).
       * @param iRC {} case-invariant Render Context
       * @param iCase {DG.Case} the case data
       * @param iIndex {number} index of case in collection
       * @param iAnimate {Boolean} (optional) want changes to be animated into place?
       */
      setCircleCoordinate: function (iRC, iCase, iIndex, iAnimate, iCallback) {
        DG.assert(iRC && iRC.map && iRC.latVarID && iRC.longVarID);
        DG.assert(iCase);
        DG.assert(DG.MathUtilities.isInIntegerRange(iIndex, 0, this.get('plottedElements').length));
        var tCircle = this.get('plottedElements')[iIndex],
            tLat = iCase.getNumValue(iRC.latVarID),
            tLong = iCase.getNumValue(iRC.longVarID);
        if (tLong < iRC.westBound) {
          tLong += Math.ceil((iRC.westBound - tLong) / 360) * 360;
        }
        else if (tLong > iRC.eastBound) {
          tLong -= Math.ceil((tLong - iRC.eastBound) / 360) * 360;
        }

        var tValid = !(Number.isNaN(tLat) || Number.isNaN(tLong)),
            tCoords = tValid ? iRC.map.latLngToContainerPoint([tLat, tLong]) : null,
            tCoordX = tCoords && tCoords.x,
            tCoordY = tCoords && tCoords.y,
            tIsMissingCase = !DG.isFinite(tCoordX) || !DG.isFinite(tCoordY);

        // show or hide if needed, then update
        this.showHidePlottedElement(tCircle, tIsMissingCase || tCircle.isHidden() || !iRC.pointsShouldBeVisible);
        if (!tIsMissingCase) {
          var tAttrs = {
            cx: tCoordX, cy: tCoordY, r: this.radiusForCircleElement(tCircle),
            fill: iRC.calcCaseColorString(iCase),
            stroke: iRC.strokeColor, 'fill-opacity': iRC.transparency, 'stroke-opacity': iRC.strokeTransparency
          };
          this.updatePlottedElement(tCircle, tAttrs, iAnimate, iCallback);
        }
        tCircle['case'] = iCase;  // Because sorting the cases messes up any correspondence between index and case
      },

      assignElementAttributes: function (iElement, iIndex, iAnimate) {
        /*
            function changeCaseValues( iDeltaValues) {
              var tXVarID = this_.getPath('model.xVarID'),
                  tYVarID = this_.getPath('model.yVarID'),
                  tChange = {
                    operation: 'updateCases',
                    cases: [],
                    attributeIDs: [ tXVarID, tYVarID],
                    values: [ [], [] ]
                  },
                  tDataContext = this_.get('dataContext');
              if( !tDataContext) return;
              // Note that we have to get the cases dynamically rather than have a variable
              // declared in the closure. The array pointed to by such a closure is not updated!
              this_.getPath('model.casesController.selection').forEach( function( iCase) {
                tChange.cases.push( iCase);
                tChange.values[0].push( iCase.getNumValue( tXVarID) + iDeltaValues.x);
                tChange.values[1].push( iCase.getNumValue( tYVarID) + iDeltaValues.y);
              });
              tDataContext.applyChange( tChange);
            }
        */

        /*
            function returnCaseValuesToStart( iCaseIndex, iStartWorldCoords) {
              var tCase = this_.getPath('model.cases')[ iCaseIndex],
                  tXVarID = this_.getPath('model.xVarID'),
                  tYVarID = this_.getPath('model.yVarID'),
                  tDeltaX = tCase.getNumValue( tXVarID) - iStartWorldCoords.x,
                  tDeltaY = tCase.getNumValue( tYVarID) - iStartWorldCoords.y;
              this_.get('model').animateSelectionBackToStart([ tXVarID, tYVarID], [ tDeltaX, tDeltaY]);
            }
        */

        function completeHoverAnimation() {
          this.hoverAnimation = null;
        }

        var this_ = this,
            tIsDragging = false,
            kOpaque = 1,
            tInitialTransform = null;
        iElement.addClass(DG.PlotUtilities.kColoredDotClassName)
            .attr({cursor: 'pointer'})
            .hover(function (event) {  // over
                  if (!tIsDragging && SC.none(tInitialTransform) && !this_.get('isInMarqueeMode')) {
                    tInitialTransform = '';
                    if (this.hoverAnimation)
                      this.stop(this.hoverAnimation);
                    this.hoverAnimation = Raphael.animation({
                          opacity: kOpaque,
                          transform: DG.PlotUtilities.kDataHoverTransform
                        },
                        DG.PlotUtilities.kDataTipShowTime,
                        '<>', completeHoverAnimation);
                    this.animate(this.hoverAnimation);
                    this_.showDataTip(this, iIndex);
                  }
                },
                function (event) { // out
                  if (!tIsDragging) {
                    if (this.hoverAnimation)
                      this.stop(this.hoverAnimation);
                    this.hoverAnimation = Raphael.animation({transform: tInitialTransform},
                        DG.PlotUtilities.kHighlightHideTime,
                        '<>', completeHoverAnimation);
                    this.animate(this.hoverAnimation);
                    tInitialTransform = null;
                    this_.hideDataTip();
                  }
                })
            .mousedown(function (iEvent) {
              SC.run(function () {
                this_.get('model').selectCase(this['case'], iEvent.shiftKey || iEvent.metaKey);
              }.bind(this));
            })
//        .drag(function (dx, dy) { // continue
//                SC.run( function() {
//                  var tNewX = this_.get('xAxisView').coordinateToData( this.ox + dx),
//                      tNewY = this_.get('yAxisView').coordinateToData( this.oy + dy),
//                      tCase = this_.getPath('model.cases')[ this.index],
//                      tOldX = tCase.getNumValue( this_.getPath('model.xVarID')),
//                      tOldY = tCase.getNumValue( this_.getPath('model.yVarID')),
//                      tCurrTransform = this.transform();
//                  // Note that we ignore invalid values. Matt managed to convert some dragged values
//                  // to NaNs during testing, which then couldn't animate back to their original
//                  // positions. This should have the effect of leaving points that would otherwise
//                  // have become NaNs in their last-known-good positions.
//                  if( isFinite( tNewX) && isFinite( tNewY)) {
//                    // Put the element into the initial transformed state so that changing case values
//                    // will not be affected by the scaling in the current transform.
//                    this.transform( tInitialTransform);
//                    changeCaseValues( { x: tNewX - tOldX, y: tNewY - tOldY });
//                    this.transform( tCurrTransform);
//                  }
//                }, this);
//            },
//            function (x, y) { // begin
//              var tCase = this_.getPath('model.cases')[ this.index];
//              tIsDragging = true;
//              // Save the initial screen coordinates
//              this.ox = this.attr("cx");
//              this.oy = this.attr("cy");
//              // Save the initial world coordinates
//              this.wx = tCase.getNumValue( this_.getPath('model.xVarID'));
//              this.wy = tCase.getNumValue( this_.getPath('model.yVarID'));
//              this.animate({opacity: kOpaque }, DG.PlotUtilities.kDataTipShowTime, "bounce");
//            },
//            function() {  // end
//              this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
//              tInitialTransform = null;
//              returnCaseValuesToStart( this.index, { x: this.wx, y: this.wy });
//              tIsDragging = false;
//              this.ox = this.oy = this.wx = this.wy = undefined;
//              this_.hideDataTip();
//            })
        ;
        iElement.index = iIndex;
        if (iAnimate)
          DG.PlotUtilities.doCreateCircleAnimation(iElement);
        return iElement;
      },

      createElement: function (iCase, iIndex, iAnimate) {

        var tCircle = this.get('paper').circle(-100, -100, this._pointRadius);
        tCircle['case'] = iCase;
        tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
        return tCircle;
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function () {
        if (this.readyToDraw()) {
          this.drawData();
          this.updateSelection();
        }
      }.observes('plotDisplayDidChange', 'model.pointColor', 'model.strokeColor', 'model.pointSizeMultiplier',
          'model.transparency', 'model.strokeTransparency'),

      updateSelection: function () {
        if (SC.none(this.get('map')))
          return;
        sc_super();
      }

    });

