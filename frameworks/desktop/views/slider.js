// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  SliderView displays a horizontal slider control that you can use to choose
  from a spectrum (or a sequence) of values.

  The property `value` holds the slider's current value. You can set the
  `minimum`, `maximum` and `step` properties as well.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
  @test in progress
*/
SC.SliderView = SC.View.extend(SC.Control,
/** @scope SC.SliderView.prototype */ {

  classNames: 'sc-slider-view',

  /**
    The WAI-ARIA role for slider view. This property's value should not be
    changed.

    @type String
  */
  ariaRole: 'slider',

  /**
    Bind this to the current value of the progress bar.  Note that by default
    an empty value will disable the progress bar and a multiple value too make
    it indeterminate.
  */
  value: 0.50,
  valueBindingDefault: SC.Binding.single().notEmpty(),

  /**
    The minimum value of the progress.

    @type {Number}
    @default 0
  */
  minimum: 0,
  minimumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the minimum progress value
    from the content object.  If this is set to null then the minimum value
    will not be derived from the content object.

    @type String
  */
  contentMinimumKey: null,

  /**
    The maximum value of the progress bar.

    @type {Number}
    @default 1
  */
  maximum: 1,
  maximumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the maximum progress value
    from the content object.  If this is set to null then the maximum value
    will not be derived from the content object.

    @type String
  */
  contentMaximumKey: null,

  /**
    Optionally set to the minimum step size allowed.

    All values will be rounded to this step size when displayed.

    @type {Number}
    @default 0.1
  */
  step: 0.1,

  /*
    When set to true, this draws and positions an element for each step, giving
    your theme the opportunity to show a mark at each step.

    @type {Boolean}
    @default {false}
  */
  markSteps: false,

  // ..........................................................
  // INTERNAL
  //

  /* @private */
  displayProperties: ['displayValue', 'ariaValue', 'minimum', 'maximum', 'step', 'markSteps'],

  /** @private
   @property
   The raw, unchanged value to be provided to screen readers and the like.
  */
  ariaValue: function() {
    return this.get('value');
  }.property('value').cacheable(),

  /* @private
    The name of the render delegate which is creating and maintaining
    the DOM associated with instances of this view.
  */
  renderDelegateName: 'sliderRenderDelegate',

  /*
    The value, converted to a percent between maximum and minimum.

    @property
    @readonly
  */
  displayValue: function() {
    return this._displayValueForValue(this.get('value'));
  }.property('value', 'minimum', 'maximum', 'step').cacheable(),

  // Given a particular value, returns the percentage value.
  _displayValueForValue: function(value) {
    var min = this.get('minimum'),
        max = this.get('maximum'),
        step = this.get('step');

    // determine the constrained value.  Must fit within min & max
    value = Math.min(Math.max(value, min), max);

    // limit to step value
    if (!SC.none(step) && step !== 0) {
      value = Math.round(value / step) * step;
    }

    // determine the percent across
    if (value !== 0) value = Math.floor((value - min) / (max - min) * 100);

    return value;
  },

  _isMouseDown: NO,

  /* @private */
  mouseDown: function(evt) {
    // Fast path, reject secondary clicks.
    if (evt.which !== 1) return false;

    if (!this.get('isEnabledInPane')) return YES; // nothing to do...
    this.set('isActive', YES);
    this._isMouseDown = YES ;
    return this._triggerHandle(evt, YES);
  },

  /* @private mouseDragged uses same technique as mouseDown. */
  mouseDragged: function(evt) {
    return this._isMouseDown ? this._triggerHandle(evt) : YES;
  },

  /* @private remove active class */
  mouseUp: function(evt) {
    if (this._isMouseDown) this.set('isActive', NO);
    var ret = this._isMouseDown ? this._triggerHandle(evt) : YES ;
    this._isMouseDown = NO;
    return ret ;
  },

  /* @private */
  mouseWheel: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;
    var min = this.get('minimum'),
        max = this.get('maximum'),
        step = this.get('step'),
        newVal = this.get('value')+((evt.wheelDeltaX+evt.wheelDeltaY)*step),
        value = Math.round(newVal / step) * step ;
    if (newVal< min) this.setIfChanged('value', min);
    else if (newVal> max) this.setIfChanged('value', max);
    else this.setIfChanged('value', newVal);
    return YES ;
  },

  /* @private */
  touchStart: function(evt){
    return this.mouseDown(evt);
  },

  /* @private */
  touchEnd: function(evt){
    return this.mouseUp(evt);
  },

  /* @private */
  touchesDragged: function(evt){
    return this.mouseDragged(evt);
  },

  /** @private
    Updates the handle based on the mouse location of the handle in the
    event.
  */
  _triggerHandle: function(evt, firstEvent) {
    var width = this.get('frame').width,
        min = this.get('minimum'), max=this.get('maximum'),
        step = this.get('step'), v=this.get('value'), loc;

    if(firstEvent){
      loc = this.convertFrameFromView({ x: evt.pageX }).x;
      this._evtDiff = evt.pageX - loc;
    }else{
      loc = evt.pageX-this._evtDiff;
    }

    // convert to percentage
    loc = Math.max(0, Math.min(loc / width, 1));

    // if the location is NOT in the general vicinity of the slider, we assume
    // that the mouse pointer or touch is in the center of where the knob should be.
    // otherwise, if we are starting, we need to do extra to add an offset
    if (firstEvent) {
      var value = this.get("value");
      value = (value - min) / (max - min);

      // if the value and the loc are within 16px
      if (Math.abs(value * width - loc * width) < 16) this._offset = value - loc;
      else this._offset = 0;
    }

    // add offset and constrain
    loc = Math.max(0, Math.min(loc + this._offset, 1));

    // convert to value using minimum/maximum then constrain to steps
    loc = min + ((max-min)*loc);
    if (!SC.none(step) && step !== 0) loc = Math.round(loc / step) * step ;

    // if changes by more than a rounding amount, set v.
    if (Math.abs(v-loc)>=0.01) {
      this.set('value', loc); // adjust
    }

    return YES ;
  },

  /** @private tied to the isEnabledInPane state */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /* @private */
  keyDown: function(evt) {
     // handle tab key
     if (evt.which === 9 || evt.keyCode === 9) {
       var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
       if(view) view.becomeFirstResponder();
       else evt.allowDefault();
       return YES ; // handled
     }
     if (evt.which >= 33 && evt.which <= 40){
       var min = this.get('minimum'),max=this.get('maximum'),
          step = this.get('step'),
          size = max-min, val=0, calculateStep, current=this.get('value');

       if (evt.which === 37 || evt.which === 38 || evt.which === 34 ){
         if (SC.none(step) || step === 0) {
           if(size<100){
             val = current-1;
           }else{
             calculateStep = Math.abs(size/100);
             if(calculateStep<2) calculateStep = 2;
             val = current-calculateStep;
           }
         }else{
           val = current-step;
         }
       }
       if (evt.which === 39 || evt.which === 40 || evt.which === 33 ){
           if (SC.none(step) || step === 0) {
              if(size<100){
                val = current + 2;
              }else{
                calculateStep = Math.abs(size/100);
                if(calculateStep<2) calculateStep =2;
                val = current+calculateStep;
              }
            }else{
              val = current+step;
            }
       }
       if (evt.which === 36){
         val=max;
       }
       if (evt.which === 35){
          val=min;
       }
       if(val>=min && val<=max) this.set('value', val);
     }else{
       evt.allowDefault();
       return NO;
     }
     return YES;
   },

  /* @private */
   contentKeys: {
     'contentValueKey': 'value',
     'contentMinimumKey': 'minimum',
     'contentMaximumKey': 'maximum',
     'contentIsIndeterminateKey': 'isIndeterminate'
   }
});
