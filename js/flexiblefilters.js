/* Component Dependencies */
var ersRateListMenuTemplate = require('templates/ersRateListMenu.hbs');
var ersRateListMenuAssociateTemplate = require('templates/ersRateListMenu-associate.hbs');
var ers4RateListMenuTemplate = require('templates/ersRateListMenu-ers4.hbs');
var ResListMenuComponent = require('reservation_libs/resListMenu-component');
var PubSub = require('libs/pub-sub');
require('jquery-ui');
var Popup = require('libs/popup');
var FlexibleFilterHandler = require('./filters/flexibleFilterHandler');
var FilterHandler = require( './filters/filterHandler' );
var FilterResultsHandler = require( './filters/filterResultsHandler' );
var errorMessagesTemplate = require('templates/partials/errorMessagesRLM-ers.hbs');
//Required for constant "CONST_ALL_KEY" used in this file 
var Constants = require('libs/constants');

PubSub.register(ResListMenuComponent.extend({
  type: 'ersRateListMenu',
  template: {
    'ersRateListMenu': ersRateListMenuTemplate,
    'ersRateListMenu-associate': ersRateListMenuAssociateTemplate,
    'ersRateListMenu-ers4': ers4RateListMenuTemplate
  },
  subscribe: {
    'CASH_AND_POINTS_INITIAL_LOAD': 'initializeCashAndPoints',
    'CASH_POINTS_DOM_MOD': 'appendRecalculateLinkAndCurrentTitle',
    'CASH_POINTS_SET_REWARDS_RULES': 'setRewardsRules',
    'CASH_POINTS_CLEAR_TITLES': 'removeTitlesForCahsAndPoints',
    'CASH_POINTS_TOGGLE_TITLES': 'toggleTitles',
    'CASH_POINTS_CASH_ONLY_MESSAGE': 'cashOnlyMessage',
    'UPDATE_RETURNTO_URL': 'updateReturnToURL',
    'RLM_SUBMIT': 'handleSubmitEvent'
  },
  events: {
    'click .add-to-cart-link': 'submitAddToCartLink',
    'click .l-package-panel': 'toggleViewAdditionalPanel',
    'click .l-see-more-package-button': 'toggleSeeMorePackagesPanel',
    'click .l-show-more-rates-button': 'toggleShowMoreRatesPanel',
    'click .js-rate-list-tabs': 'handleTabClick',
    'click .js-group-rates': 'handleGroupTabClick',
    'click .js-add-to-cart-button': 'handleAddToCartButton'
  },
  bindEvents: function($) {
    var _self = this;  
    //initiate tabs handler
    _self.handleTabs();
    _self.handleTabIndex();

    //Bind event on Rate list menu tab container scroll on page load
    _self.handleTabsForMobile();

    //Bind event on submit button
    _self.$el.find('.rate-button button.m-button-default').on('click', function(e) {
      e.preventDefault();
      _self.handleSubmitEvent($(this));
    });

    //Bind event for registering popups on component load
    _self.registerListPopups();

    //initiate filters for ERS
    if (_self.$el.hasClass('tile-ers-rate-list-menu') ||
      _self.$el.hasClass('tile-ers-rate-list-menu-associate')) {
      _self.initializeFilterHandler();
      _self.initializeFilterResultsHandler();
    }
    else {
      var flexibleFilterHandler = new FlexibleFilterHandler(_self.$el);
      _self.$el.find('.js-filtered-room-list').hide();
    }

    //Bind event on Rate list menu tab container scroll for mobile
    _self.$el.find('.l-tab-container ul').on('scroll', function(e){
      e.preventDefault();
      _self.handleTabsForMobile();
    });
    //Bind event on Rate list menu tab container on window resize
    $(window).on('resize' , function(){
        _self.handleTabsForMobile();
    });
    //Target to default tab
    _self.targetDefaultTab();
    //Bind event on customize button
    _self.$el.find('.js-ers-customize-btn.use-points-trigger').on('click', function(e) {
      e.stopPropagation();
      _self.handleWidget($(this), '.id-content-wrapper');
      $(this).find('.t-icon').toggleClass('t-icon-cross').toggleClass('t-icon-arrow-down');
    });
    //Bind event on customize button for ERS4
    _self.$el.find('.js-ers4-customize-btn.use-points-trigger').on('click', function(e) {
      e.stopPropagation();
      _self.handleWidget($(this), '.id-content-wrapper');
      $(this).find('.t-icon').toggleClass('t-icon-minus').toggleClass('t-icon-plus');
    });
    // Calling methods for tabs change on enter key press while tabbing on the dom
    _self.$el.tabs({
      activate: function(event, ui) {
        _self.handleTabClick(event, ui);
      }
    });
    _self.$el.find('a.is-hidden-no-js').addClass('is-hidden');
    _self.$el.find('button.is-hidden-no-js').removeClass('is-hidden');
  },

  /**
    * This function is used to show filters for standard tab only  
    * on component load
    * @return : boolean The method has executed successfully
  */
  toggleFiltersView: function _toggleFiltersView(ratetype) {
    var _self = this;
    var filterSelector = _self.$el.find('.js-filters-container');
    // This condition works when ERS4 Flexible filter has been rendered.
    if(_self.$el.hasClass('tile-ers-rate-list-menu-ers4'))
    {
      ratetype === 'standard' ? filterSelector.removeClass('l-display-none'): filterSelector.addClass('l-display-none');
    }  
    else{
          ratetype === 'standard' ? filterSelector.removeClass('l-display-none').addClass('l-display-flex') : filterSelector.addClass('l-display-none').removeClass('l-display-flex');
        }

    return true;
  },

  /**
    * This function is used to handle the Add-to-cart button click  
  */
  handleAddToCartButton: function _handleAddToCartButton(event){
    var _self = this,
        $targetElement = $(event.currentTarget),
        cartContext,
        data;

    event.preventDefault();    

    data = {
      'selectedProductId': $targetElement.data('productid'),
      'sessionToken': _self.getSessionToken()
    };
    cartContext = {
      cartKeepAlive: 'true'
    };
    _self.makeAjaxCall({
      url: $targetElement.data('url'),
      method: 'POST',
      data: JSON.stringify(data),
      success: function(response) {
        // don't proceed if response has nextStateURI flag for redirection
        if (response.nextStateURI) {
          return;
        }
        _self.checkErrorsAddCart(response, $targetElement, cartContext);
      }
    });
  },

  /* 
   * This method is called when AJAX call invoked on 'add to cart' button(M.com) gives a response.
   * If response status is failure, then show the error message box using the template.
   * If response status is success, then it refreshes Cart and session, and shows 'Selected' label
   * @param {Object} resData is the response from AJAX call
   * @param {Object} targetElement is JqueryDOM on which event is triggered
   * @param {Object} cartContext sent while refreshing cart session
   */
  checkErrorsAddCart: function _checkErrorsAddCart(resData, $targetElement, cartContext) {
    var _self = this,
    addToCart,
    rateNotFoundTemplate;
    if (resData.status === 'failure') {
      rateNotFoundTemplate = $(errorMessagesTemplate(resData));
      _self.$el.find('.js-rlm-error-container').html(rateNotFoundTemplate);
    } else {
      _self.$el.find('.js-rlm-error-container').html('');
      $targetElement.toggleClass('l-selected-button');
      $targetElement.find('.l-addcart-label').toggleClass('is-hidden');
      $targetElement.find('.l-selected-label').toggleClass('is-hidden');

      _self.pubsub.publish('REFRESH_CART_SESSION', [cartContext]); //pass context cartKeepAlive = true
      _self.pubsub.publish('REFRESH_SESSION_BTN');
      _self.pubsub.publish('STICKY_CART_REFRESH');
      _self.pubsub.publish('REFRESH_CART_PROGRESSBAR');
    }
  },

  /**
    * This function is used to target on default tab if exists any specific else target to first tab   
    * on component load
  */
  targetDefaultTab: function _targetDefaultTab(){
    var rateTabs = this.$el.find('.l-rate-tabs'),
        defaultTab = rateTabs.attr('data-default-tab'),
        setQueryParams = rateTabs.data('set-query-params'),
        tabFilterHandler;
    this.$el.find('.l-rate-tabs a[data-rate-type='+defaultTab+']').click();
    if(setQueryParams){
      tabFilterHandler = new FilterHandler({});
      tabFilterHandler.updateQueryStringParam(rateTabs.attr('data-default-label'), defaultTab);
    }
    this.pubsub.publish('RLM_TAB_CLICKED', [defaultTab]);
  },
  /*
    This function is used to register the pop-ups(like: room-details, rate-details, image-gallery etc.)
    on component load
    @return {this} Refrence to the current object
  */
  registerListPopups: function _registerListPopups() {
    var _self = this;
    if (_self.$el.find('.room-rules.mi-popover').length) {
        var rateDetails = new Popup({
            selector: '#room-rate-container .room-rules.mi-popover',
            sourceBlock: '.modal-content',
            alternateCloseMarkup: true
        });
        rateDetails.register();
    }

    if (_self.$el.find('.m-room-point-saver').length) {
        var pointSaver = new Popup({
            selector: '#room-rate-container .m-room-point-saver.mi-popover',
            parent: 'rateListMenu',
            sourceBlock: '.modal-content',
            alternateCloseMarkup: true
        });
        pointSaver.register();
    }

    _self.$el.find('.js-photo-gallery, .m-room-details-link.mi-popover').on('click', function(e){
        e.preventDefault();
        _self.openGalleryRoomFeature($(this));
    });

    if (_self.$el.find('.l-tell-us-feedback').length) {
      var feedbackPopup = new Popup({
          selector: '#room-rate-container .js-tell-us-link',
          sourceBlock: '.modal-content',
          alternateCloseMarkup: true
      });
      feedbackPopup.register();
    }
    return true;
  },
  /**
    * This function is used to register the pop-up of Photo-gallery + Room-detail-feature + Room-detail-Hotel-Info Components
    * Also this pop-up will open on clicking photo as well as Room-detail link Present on RLM page.
    */
  openGalleryRoomFeature: function _openGalleryRoomFeature($element) {
    var galleryPopup = new Popup({
      open: true,
      url: $element.attr('href') || $element.data('url'),
      sourceBlock: '.modal-content',
      alternateCloseMarkup: true
    });
    galleryPopup.register();
  },
  /**
    * This function is called on the page load and binds click event to the tabs
    */
  handleTabIndex: function _handleTabIndex() {
    var liTabs = this.$el.find('li[role=tab]');
    if(liTabs && liTabs.length) {
      liTabs.on('click keydown', function(event){
        if ((event.type === 'keydown' && event.keyCode === 13) || event.type === 'click') {
          liTabs.attr('tabindex', 0);
        }
      });
      liTabs.attr('tabindex',0);
    }
  },

  /**
    * This function is used to assign attributes to the rate tabs and calls roomRateTabs method
    */
  handleTabs: function _handleTabs() {
    this.$el.attr('data-ratetabs', this.$el.find('[data-showtabs]').attr('data-showtabs'));
    this.$el.find('form').css('left', '0');
    this.roomRateTabs();
  },

  /**
   * This function is used to handle scroll functionality of tabs for rate list menu on mobile view.
   * An overlay is shown on top of rate list menu tabs in mobile view if more tabs are available than viewport's width.
   * @return : boolean The method has executed successfully
  */
  handleTabsForMobile: function _handleTabsForMobile() {
    var $this = this.$el.find('.l-tab-container ul'),
        $mobileOverlayContainer = this.$el.find('.js-mobile-tabs-scroll-overlay'),
        listItems = $this.find('li').length,
        lastListItemWidth = $this.find('li:last-child').width() - 20,
        sum = 0;
    $this.find('li').each(function(){
        sum = sum +$(this).outerWidth();
    });
    if(($this.scrollLeft() >= $this.outerWidth()/(listItems-1)) || (listItems <= 3 && $this.scrollLeft() !== 0) || $(window).width() >= sum - lastListItemWidth)
      $mobileOverlayContainer.hide();
    else
      $mobileOverlayContainer.show();
    return true;
  },

  /**
    * This function is used set the initial selected tab and add required classes accordingly
    */
  roomRateTabs: function _roomRateTabs() {
    var disabledTabValue = this.$el.filter('#room-rate-container :hidden[name=disabledTab]').val(),
    disabledTab = (disabledTabValue) ? disabledTabValue.split(',').map(function(i) {
      return parseInt(i, 10);
    }) : [],
    selectedTab = 0;

    // Only If MEO/EEO rates requested and available then make selected tab
    // equal to MROffer Tab
    if ((this.$el.length > 0) && (this.$el.data('meoeeoratesavailable') === 'true')) {
      selectedTab = this.$roomRateContainer.data('tabsize' - 1);
    } else {
      for (var i = 0; i < 4; i++) {
        if ($.inArray(i, disabledTab) === -1) {
          selectedTab = i;
          break;
        }
      }
    }

    if (this.$el.data('ratetabs') === true) {
      this.$el.tabs({
        selected: selectedTab,
        disabled: disabledTab
      });
    };

    // Remove/set elements for JS version
    this.$el.find('ul#anchors').addClass('rate-type-tabs');
    this.$el.find('ul.rate-type-tabs').removeAttr('id');
    this.$el.find('.room-rate-results tr:first-child td').css('border-top', 'none');
    this.currentTabContainer = this.$el.find('.results-container:visible');
  },
  
  /**
   * This method creates return to url with selected product ID and 
   * @return  {callback} callback method for pubsub event
   */
  updateReturnToURL: function _updateReturnToUrl(callback){
    var returnToURL = this.$el.find('form').attr('action')+
    '?selectedProductId='+this.$el.find('#selectedProductId').val()+'&rewardsRedemptionSelected=true&propertyCode='+this.$el.find('input[name="propertyCode"]').val();
    return typeof callback === 'function' ? callback(returnToURL) : returnToURL;
  },
  /**
   * This function is called on click of tabs like "Standard" , "Rewards", "Prepay" etc.
   * It first checks the rate type of the tab clicked and then is used to toggle the bed type guaranteed message
   * If rate type of tab is standard tab bed type guaranteed message is shown otherwise this message is hidden
   *@returns {Boolean} Returns status of the operation success or failure
  */
  handleTabClick: function _handleTabClick(event, ui) {
    var _self = this,
        rateType,
        $bedTypeGuaranteedSection = _self.$el.find('.js-bed-type-guaranteed-section'),
        $tellUsFeedbackForm = _self.$el.find('.js-tell-us-feedback'),
        isModifyPath = $bedTypeGuaranteedSection.data('modify-path');
        
    event.preventDefault();
    if( event.currentTarget ) {
      rateType = ($(event.currentTarget).hasClass('ui-tabs-anchor')) ? _self.$el.find(event.currentTarget).data('rate-type') : _self.$el.find(event.currentTarget).find('a').data('rate-type');
    } else {
      rateType = ui.newTab.find('a').data('rate-type');
    }
    _self.currentTabContainer = _self.$el.find('.m-results-container[data-rate-type=' + rateType + ']');
    if(rateType === 'standard') {
      if(isModifyPath){
        $bedTypeGuaranteedSection.removeClass('l-display-block').addClass('l-display-none l-m-display-block');
      }else{
        $bedTypeGuaranteedSection.removeClass('l-display-none l-m-display-block').addClass('l-display-block');
        $tellUsFeedbackForm.removeClass('l-display-none').addClass('l-display-block');
      }
    }
    else {
      $bedTypeGuaranteedSection.removeClass('l-m-display-block l-display-block').addClass('l-display-none');
      $tellUsFeedbackForm.removeClass('l-display-block').addClass('l-display-none');
    }

    //show filters on standards tab.
    _self.toggleFiltersView(rateType);

    //hide group tab content on any tab click, other than group rates
    _self.hideGroupTab();

    //publish the tab clicked event for other tiles to consume
    _self.pubsub.publish('RLM_TAB_CLICKED', [rateType]);

    return true;
  },
  /**
  * This function is used to toggle panel like "View more additional rooms" based on room type
  * On click of plus icon all the additional rooms gets expanded
  * While on click of minus icon it resumes to its original position and all the additional rooms get collapsed
  * @returns {Boolean} Returns status of the operation success or failure
  */
  toggleViewAdditionalPanel: function _toggleViewAdditionalPanel(event){
    var $panelClicked = $(event.currentTarget),
        $roomRateResultsContainer = $panelClicked.parents('.l-room-type-category-section').find('.room-rate-results'),
        $panelIcon = $panelClicked.find('.l-package-panel-icon'),
        initialValue = $panelClicked.parents('.l-room-type-category-section').attr('data-pagination-index'),
        roomRateResultsContainerLength = $roomRateResultsContainer.length,
        index = 0;
    event.preventDefault();

    // For Panel Button NVDA accessibility
    $panelClicked.attr('aria-pressed', ($panelClicked.attr('aria-pressed') === 'true' ? false : true));

    if($panelClicked.hasClass('js-more-rooms')){
      $roomRateResultsContainer.removeClass('is-hidden-container');
      $panelIcon.removeClass('t-icon-plus-sign').addClass('t-icon-minus-sign');
      $panelClicked.removeClass('js-more-rooms').addClass('js-less-rooms');
    }
    else if($panelClicked.hasClass('js-less-rooms')){
      for(index = initialValue; index <= roomRateResultsContainerLength; index++){
        $roomRateResultsContainer.eq(index).addClass('is-hidden-container');
      }
      $panelIcon.removeClass('t-icon-minus-sign').addClass('t-icon-plus-sign');
      $panelClicked.removeClass('js-less-rooms').addClass('js-more-rooms');
    }
    return true;
  },
  /**
  * This function is used to toggle panel like "See more packages" based on rate type
  * On click of down arrow all the additional rate types gets expanded
  * While on click of cross icon it resumes to its original position and all the additional rate types get collapsed
  * @returns {Boolean} Returns status of the operation success or failure
  */
  toggleSeeMorePackagesPanel: function _toggleSeeMorePackagesPanel(event){
    var $this = $(event.currentTarget),
        $seeMorePackagesPanel = this.currentTabContainer.find('.js-rate-container'),
        $rateResultsContainer = $this.parent().siblings('.l-rate-inner-container'),
        $panelIcon = $this.find('.l-see-more-panel-icon'),
        $activePanel = $seeMorePackagesPanel.find('.js-less-packages'),
        $activeRateResultsContainer = $activePanel.parent().siblings('.l-rate-inner-container'),
        $activePanelIcon = $activePanel.find('.l-see-more-panel-icon'),
        activePanelInitialValue = $activePanel.data('initial-value'),
        activeRateResultsContainerLength = $activeRateResultsContainer.length,
        index = 0;

    event.preventDefault();
    //This condition collapses the current panel or the panel which is in expanded state in current DOM
    if($activePanel.length){
      for(index = activePanelInitialValue; index <= activeRateResultsContainerLength; index++){
        $activeRateResultsContainer.eq(index).addClass('is-hidden-container');
      }
      $activePanelIcon.removeClass('t-icon-cross').addClass('t-icon-arrow-down');
      $activePanel.removeClass('js-less-packages l-margin-bottom-half').addClass('js-more-packages');
    }
    //This condition expands the current panel if it is in collapsed state and is not the panel which was expanded before
    if($this.hasClass('js-more-packages') && $this.get(0) !== $activePanel.get(0)){
      $rateResultsContainer.removeClass('is-hidden-container');
      $panelIcon.removeClass('t-icon-arrow-down').addClass('t-icon-cross');
      $this.removeClass('js-more-packages').addClass('js-less-packages l-margin-bottom-half');
    }
    return true;
  },
  /**
  * This function is used to toggle panel like "See more packages" based on rate type
  * On click of down arrow all the additional rate types gets expanded
  * While on click of cross icon it resumes to its original position and all the additional rate types get collapsed
  * @returns {Boolean} Returns status of the operation success or failure
  */
  toggleShowMoreRatesPanel: function _toggleShowMoreRatesPanel(event){
    var $this = $(event.currentTarget),
        $showMoreRatesPanel = this.currentTabContainer.find('.js-rate-container'),
        $rateResultsContainer = $this.parent().siblings('.l-rate-inner-container'),
        $panelIcon = $this.find('.l-show-more-rates-icon'),
        $activePanel = $showMoreRatesPanel.find('.js-less-packages'),
        $activeRateResultsContainer = $activePanel.parent().siblings('.l-rate-inner-container'),
        $activePanelIcon = $activePanel.find('.l-show-more-rates-icon'),
        activePanelInitialValue = $activePanel.data('initial-value'),
        activeRateResultsContainerLength = $activeRateResultsContainer.length,
        index = 0;

    event.preventDefault();
    //This condition collapses the current panel or the panel which is in expanded state in current DOM
    if($activePanel.length){
      for(index = activePanelInitialValue; index <= activeRateResultsContainerLength; index++){
        $activeRateResultsContainer.eq(index).addClass('is-hidden-container');
      }
      $activePanelIcon.removeClass('t-icon-minus').addClass('t-icon-plus');
      $activePanel.removeClass('js-less-packages l-margin-bottom-half').addClass('js-more-packages');
    }
    //This condition expands the current panel if it is in collapsed state and is not the panel which was expanded before
    if($this.hasClass('js-more-packages') && $this.get(0) !== $activePanel.get(0)){
      $rateResultsContainer.removeClass('is-hidden-container');
      $panelIcon.removeClass('t-icon-plus').addClass('t-icon-minus');
      $this.removeClass('js-more-packages').addClass('js-less-packages l-margin-bottom-half');
    }
    return true;
  },
  /**
    * This function initiates all the filters present in DOM by creating a fresh instance for every filter
    * @return {this} Refrence to the current object
  */
  initializeFilterHandler: function _initializeFilterHandler() {
    var filterHandlers = [],
        _self = this;
    this.filterHandlers = filterHandlers;
    this.$el.find( '.js-filters-list' ).each( function( index, filter ) {
      filterHandlers.push( new FilterHandler( filter, {
        onFilterChange: _self.onFilterChange.bind( _self )
      } ) );
    } );
    return this;
  },
  /**
    * This function is called whenever filter changes and then passes the selectedFilter and selected value of that filter
    * in order to manipulate the rooms/suites etc available as per that filter value
    * @param {*String} selected filter like bedType viewType etc.
    * @param {*String} value of selected filter
    * @returns {Boolean} Returns status of the operation success or failure
  */
  onFilterChange: function _onFilterChange( selectedFilter, selectedValue ) {
    var _self = this,
        filterCount = this.filterHandlers.length,
        filterObj = {},
        ctr,
        filterHandler;
        
    filterObj.filters = {};
    filterObj.length = 0;
    for ( ctr = 0; ctr < filterCount; ctr++ ) {
      this.filterHandlers[ ctr ].filterSelected( selectedFilter, selectedValue, this.filterHandlers );
      if ( Constants.GLOBAL.CONST_ALL_KEY !== this.filterHandlers[ ctr ].data.selectedValue && "" !== this.filterHandlers[ ctr ].data.selectedValue ) {
        filterObj.filters[ this.filterHandlers[ ctr ].data.type ] = this.filterHandlers[ ctr ].data.selectedValue;
        filterObj.length++;
      }
      //this function is called to update the query string parameters whenever filter is changed
      this.filterHandlers[ctr].updateQueryStringParam( this.filterHandlers[ ctr ].data.type, this.filterHandlers[ ctr ].data.selectedValue );
    }
    this.filterResultsHandler.filterResults( filterObj, function(filters, roomsCollection) {
      filterHandler = _.filter(_self.filterHandlers, function(filterHandler) {return filterHandler.data.type == "viewType"})[0];
      filterHandler.checkFiltersVisibility(filters, roomsCollection);
    } );
    return true;
  },
  /**
    * This function creates a new instance of the FilterResulsHandler with standard tab data
    * @return {this} Refrence to the current object
  */
  initializeFilterResultsHandler: function _initializeFilterResultsHandler() {
    var $standardsTab = $( '.results-container[data-rate-type=standard]' );
    this.filterResultsHandler = new FilterResultsHandler( $standardsTab );
    return this;
  },
  /*
   * This method is called when 'add to cart' link is clicked.
   * It makes an AJAX call to send product ID and session token.
   * In success case, checkErrors method is called for showing error messages.
   * @param {Event} event
   * @return {Boolean} returns status of operation true or false
   */
  submitAddToCartLink: function _submitGoToCart(event) {
    var targetElement = '',
      data, _self = this,
      cartContext;
    event.preventDefault();
    targetElement = $(event.target);
    data = {
      'selectedProductId': targetElement.attr('data-payload'),
      'sessionToken': _self.getSessionToken()
    };
    cartContext = {
      cartKeepAlive: 'true'
    };
    _self.makeAjaxCall({
      url: targetElement.attr('data-endpoint'),
      method: 'POST',
      data: JSON.stringify(data),
      success: function(response) {
        // don't proceed if response has nextStateURI flag for redirection
        if (response.nextStateURI) {
          return;
        }
        _self.checkErrors(response, targetElement, cartContext);
      }
    });
    return true;
  },
  /* 
   * This method is called when AJAX call invoked on 'add to cart' link gives a response.
   * If response status is failure, then show the error message box using the template.
   * If response status is success, then it refreshes booking cart and session, and shows 'go to cart' label
   * @param {Object} resData is the response from AJAX call
   * @param {Object} targetElement is JqueryDOM on which event is triggered
   * @param {Object} cartContext sent while refreshing cart session
   */
  checkErrors: function(resData, targetElement, cartContext) {
    var _self = this,
    addToCart,
    rateNotFoundTemplate;
    if (resData.shoppingCartFlag && resData.status === 'failure') {
      rateNotFoundTemplate = $(errorMessagesTemplate(resData));
      _self.$el.find('.js-rlm-error-container').html(rateNotFoundTemplate);
    } else {
      _self.$el.find('.js-rlm-error-container').html('');
      addToCart = targetElement.parent();
      addToCart.addClass('is-hidden');
      addToCart.parent().find('.added-to-cart-row').removeClass('is-hidden');
      _self.pubsub.publish('BOOKING_CART_REFRESH');
      _self.pubsub.publish('REFRESH_CART_SESSION', [cartContext]); //pass context cartKeepAlive = true
      _self.pubsub.publish('REFRESH_SESSION_BTN');
    }
  },
  
  /**
   * This method shows Group tab content by displaying listOfGroup and lookupGroup components
   * @returns {Boolean} Returns status of the operation success or failure
   */
  handleGroupTabClick: function() {
    var context = {
      groupTiles: true
    };
    this.$el.find('.m-room-rate-form').addClass('is-hidden');
    this.pubsub.publish('GROUP_TAB',[context]);

    return true;
  },
 
  /**
   * This method hides group tab content by hiding listOfGroup and lookupGroup components
   * @returns {Boolean} Returns status of the operation success or failure 
   */
  hideGroupTab: function() {
    var context = {
      groupTiles: false
    };
    this.$el.find('.m-room-rate-form').removeClass('is-hidden');
    this.pubsub.publish('GROUP_TAB',[context]);

    return true;
  }
}));