// ==========================================================================
//                            DG.LabelNode
//
//  Author:   William Finzer
//
//  Copyright ©2016 Concord Consortium
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

/** @class  DG.LabelNode - A small object that can hold onto information needed to drag an axis or legend
 * label and initiate the drag that SproutCore expects.

 @extends SC.Object
 */
DG.LabelNode = SC.Object.extend(
  /** @scope DG.LabelNode.prototype */
    {
      paper: null,
      text: null,
      description: null,
      colorIndex: 0,
      numColors: 1,
      rotation: 0,
      priorNode: null,
      loc: null,  // {x, y}
      _circleElement: null,
      _textElement: null,
      kCircleRadius: 6,
      anchor: 'center',

      bBox: function() {
        return this._textElement.getBBox();
      }.property('text'),

      init: function() {

        this._textElement = this.paper.text(0, 0, '')
            .attr( { 'text-anchor': this.anchor });
        DG.RenderingUtilities.rotateText(this._textElement, this.rotation, 0, 0);
        this.numColorsChanged();
      },

      numColorsChanged: function() {
        var tTextColor = 'blue',
            tPointColor = 'lightblue';
        this._textElement.addClass('axis-label');
        this._textElement.removeClass('axis-label-empty-graph');
        switch( this.numColors) {
          case 0:
            tTextColor = DG.PlotUtilities.kEmptyPromptColor;
            this._textElement.removeClass('axis-label');
            this._textElement.addClass('axis-label-empty-graph');
            break;
          case 1:
            tTextColor = 'blue';
            tPointColor = 'lightblue';
            break;
          default:
            if (this.colorIndex === 0) {
              tTextColor = DG.PlotUtilities.kDefaultPointColor;
            }
            else {
              tTextColor = DG.ColorUtilities.calcAttributeColorFromIndex(this.colorIndex, this.numColors).colorString;
            }
            tPointColor = tTextColor;
        }
        this._textElement.attr('fill', tTextColor);

        if((this.numColors > 1) && !this._circleElement) {
          this._circleElement = this.paper.circle(0, 0, this.kCircleRadius)
              .addClass('axis-dot');
        }
        else if((this.numColors <= 1) && this._circleElement) {
          this._circleElement.remove();
          this._circleElement = null;
        }
        if( this._circleElement)
          this._circleElement.attr('fill', tPointColor);
      }.observes('numColors'),

      textChanged: function() {
        this._textElement.attr('text', this.text);
      }.observes('text'),

      descriptionChanged: function() {
        this._textElement.attr('title', this.description);
      }.observes('description'),

      locChanged: function() {
        var tYOffset = this._circleElement ? this.kCircleRadius / 2 : 0;
        this._textElement.attr({ x: this.loc.x, y: this.loc.y - tYOffset });
        DG.RenderingUtilities.rotateText(this._textElement, this.rotation, this.loc.x, this.loc.y - tYOffset);
        if( this._circleElement) {
          var tBox = this._textElement.getBBox(),
              tCenter;
          if (this.rotation !== 0) {
            tCenter = { cx: this.loc.x + 1, cy: this.loc.y - tYOffset + tBox.height / 2 + this.kCircleRadius + 2 };
          }
          else {
            tCenter = { cx: this.loc.x - (tBox.width / 2 + this.kCircleRadius + 2), cy: this.loc.y };
          }
          this._circleElement.attr( tCenter);
        }
      }.observes('loc'),

      extent: function() {
        var tResult = this._textElement.getBBox();
        if( this._circleElement) {
          tResult.width += (this.rotation === 0) ? 2 * this.kCircleRadius + 2 : 0;
          tResult.height += (this.rotation !== 0) ? 2 * this.kCircleRadius + 2 : 0;
        }
        return tResult;
      },

      mousedown: function( iHandler) {
        this._textElement.click( iHandler);
        this._circleElement && this._circleElement.click( iHandler);
      },

      unmousedown: function( iHandler) {
        this._textElement.unclick( iHandler);
        this._circleElement && this._circleElement.unclick( iHandler);
      },

      /**
       *
       * @param {DG.DragLabelHandler}
       * @returns {LabelNode}
       */
      setDragLabelHandler: function( iHandler) {
        this._textElement.drag( iHandler.handleDoDrag, iHandler.handleStartDrag, iHandler.handleEndDrag,
            iHandler, iHandler, iHandler);
        //this._circleElement && this._circleElement.drag( null, iHandler.handleDrag, null, null, iHandler);
        return this;
      },

      remove: function() {
        this._textElement.remove();
        this._circleElement && this._circleElement.remove();
      }
    }
 );
