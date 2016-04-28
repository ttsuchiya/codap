// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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
/** @class  DG.DataInteractiveModel - The model for a slider. Holds onto a global value.

 @extends SC.Object
 */
DG.DataInteractiveModel = SC.Object.extend(/** @scope DG.DataInteractiveModel.prototype */ {

  /**
   * @type {String}
   */
  title: null,

  /**
   * @type {String}
   */
  version: null,

  /**
   * @type {Object}
   */
  dimensions: null,

  /*
   * At present a data interactive can have only one context.
   * @type {DG.DataContext}
   */
  context: null,

  init: function () {
    sc_super();
  }

});