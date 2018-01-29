/* Dependencies */
var _ = require('lodash');
var Constants = require('libs/constants');
var FlexibleFilter = require('./flexibleFilter');
var FlexibleFilterRenderer = require('./flexibleFilterRenderer');
var PageTakeover = require('libs/pageTakeover');

var FlexibleFilterHandler = function(el) {
  if(! this instanceof FlexibleFilterHandler) {
    return new FlexibleFilterHandler(el);
  }
  this._tileElement = el;
  this._filter = new FlexibleFilter(this._tileElement.find('.js-filtered-room-list').data('ers4-room-list'));
  this._renderer = new FlexibleFilterRenderer(this._tileElement.find('.js-filtered-room-list'));
  this.init();
}
/**
* This function initiates the objects used in filter functionality.
*/
FlexibleFilterHandler.prototype.init = function _init() {
  var _self = this;
  _self.takeoverBlock = _self._tileElement.find('.js-sort-takeover');
  _self.filteredResultElem;
  _self.initialFilterCount;
  _self._tileElement.find('.js-primary-filter').on('click', function(e) {
    $(this).toggleClass('filter-selection');
    $(this).find('span.t-icon-cross').toggleClass('l-display-none');
  });
  _self.filterTakeover = PageTakeover.create({
    $el: _self.takeoverBlock,
    hidePageHeader: true,
    isNotRetainDisplayAttribute: true,
    beforeShow: function() {
    },
    beforeHide: function() {
    },
    afterHide: function () {
      _self.takeoverBlock.addClass('is-hidden');
    },
    onLoad: function() {
      _self._tileElement.find('.js-sort-takeover').find('.m-button-default').show();
    }
  });
 
  
  _self._tileElement.find('.js-view-more-rooms').on('click', _self.viewMoreRooms.bind(_self));
  _self._tileElement.find('.t-toggle-drop-down').on('click', _self.addFiltersTakeOver.bind(_self));
  _self._tileElement.find(".js-desktop-checkbox").on('change',_self.selectedFilters.bind(_self, false));
  _self._tileElement.find(".js-primary-filter").on('click',_self.selectedFilters.bind(_self, false));
  _self._tileElement.find(".l-selected-pills").on('click',"li span",_self.selectedFilters.bind(_self, true));
  _self._tileElement.find('.js-apply-filter').on('click', _self.applyfiltertakeover.bind(_self));
  _self._tileElement.find('.js-clear-filter').on('click', _self.clearAllFilters.bind(_self));
}
/**
* This function Create pills for selected filters.
* @param  filterAttribute uses to make pills with selected attributes.
*/
FlexibleFilterHandler.prototype.createPillsDom = function _createPillsDom(filterAttribute){
  var _self=this;
  _self._tileElement.find(".l-selected-pills ul").html('');
  $(filterAttribute).each(function(index, item) {
  var element = _self._tileElement.find('[data-attribute="'+item+'"]');
  _self._tileElement.find(".l-selected-pills ul").append('<li data-attribute="' + item + '" data-category="' + element.data('category') + '" class="t-cursor-pointer l-margin-top-quarter l-margin-left">' + element.data('label')+ '<span class="t-icon t-icon-cross l-margin-left-quarter"></span></li>');
  });
}
/**
* This function is called on Apply filter click at takeover on tablet.
*/
FlexibleFilterHandler.prototype.applyfiltertakeover = function _applyfiltertakeover(){
  var _self=this,
  selectedFiltersObj = {},
  filterAttribute=[];
  _.assign(selectedFiltersObj, _self.primarySelectedFitlers(),_self.secondaryTakeoverSelectedFilters());
  filterAttribute = _self.createFilterAttribute(selectedFiltersObj);
  _self.createPillsDom(filterAttribute);
  _self.removeFiltersTakeover();
  _self.getSelectedFilters(selectedFiltersObj);
}
/**
* This function is called on Cancel filter click at takeover on tablet.
*/
FlexibleFilterHandler.prototype.clearAllFilters = function _clearAllFilters(){
  var _self=this,
  selectedFiltersObj = {};
  _self._tileElement.find('.js-takeover-checkbox:checked').each(function(index, item) {
    $(item).prop('checked',false);
  });
  _self.removeFiltersTakeover();
  _self.getSelectedFilters(selectedFiltersObj);
}
/**
*This function called on takeover accordian filters and pass the array object.
*@return {takeoverSelectedFilters} all selected filters attributes.
*/
FlexibleFilterHandler.prototype.secondaryTakeoverSelectedFilters = function _secondaryTakeoverSelectedFilters(){
  var  _self = this;
  var  takeoverSelectedFilters = {};
  _self._tileElement.find('.js-takeover-checkbox:checked').each(function() {
    if(!takeoverSelectedFilters[$(this).data('category')]) {
      takeoverSelectedFilters[$(this).data('category')] = [];
    }
  takeoverSelectedFilters[$(this).data('category')].push($(this).data('attribute'));
  });
  return takeoverSelectedFilters;
}
/**
* This function called on desktop/Tablet for primary filters selection.
* @retrun {primarySelectedFiltersObj} object array for selected filters.
*/
FlexibleFilterHandler.prototype.primarySelectedFitlers = function _primarySelectedFitlers() {
  var  _self = this;
  var  primarySelectedFiltersObj = {};
  _self._tileElement.find('.l-l-filter li.filter-selection').each(function() {
  if(!primarySelectedFiltersObj[$(this).data('category')]) {
    primarySelectedFiltersObj[$(this).data('category')] = [];
  }
  primarySelectedFiltersObj[$(this).data('category')].push($(this).data('attribute'));
  });
  return primarySelectedFiltersObj;
}
/**
* This function called on desktop on the selection of accordian filters.
* @retrun {secondarySelectedFilters} object array for selected filters.
*/
FlexibleFilterHandler.prototype.secondarySelectedFilters = function secondarySelectedFilters() {
  var  _self = this;
  var  secondarySelectedFilters = {};
  _self._tileElement.find('.js-desktop-checkbox:checked').each(function() {
    if(!secondarySelectedFilters[$(this).data('category')]) {
      secondarySelectedFilters[$(this).data('category')] = [];
    }
    secondarySelectedFilters[$(this).data('category')].push($(this).data('attribute'));
  });
  return secondarySelectedFilters;
}
/**
* This function fetches attributes from the selected filters ArrayObject.
* @retrun filterAttribute Array to create pills from selected object array.
*/
FlexibleFilterHandler.prototype.createFilterAttribute = function createFilterAttribute(filterObj) {
  var filterAttribute =[];
  _.forIn(filterObj, function(value, key) {
    filterAttribute= _.union(filterAttribute, value);
  })
  return filterAttribute;
}
/**
* This function called attributes from the selected filters ArrayObject.
* @param  isRemoved uses to  uncheck filter pills
* @param  event uses to get targeted event.
* @return {Array object } Selected filters category and their attributes.
*/
FlexibleFilterHandler.prototype.selectedFilters = function _selectedFilters(isRemoved, event) {
  var  _self = this;
  var  filterAttribute = [];
  var  selectedFiltersObj = {};
  var  discardFilter = $(event.target).closest('li');
  _.assign(selectedFiltersObj, _self.primarySelectedFitlers(), _self.secondarySelectedFilters(), _self.secondaryTakeoverSelectedFilters());
  filterAttribute = _self.createFilterAttribute(selectedFiltersObj);
  if(isRemoved && filterAttribute.indexOf(discardFilter.data('attribute')) !== -1 ) {
    var origElement = $('.mi-accordion [data-attribute="' + discardFilter.data('attribute') + '"]');
    if(origElement.hasClass('filter-selection')) {
      origElement.removeClass('filter-selection');
      origElement.find('span.t-icon-cross').toggleClass('l-display-none');
    }
    else {
      origElement.prop('checked', false);
    }
    var selectedcat = discardFilter.data('category');
    selectedFiltersObj[selectedcat].splice(selectedFiltersObj[selectedcat].indexOf(discardFilter.data('attribute'), 1));
    filterAttribute.splice(filterAttribute.indexOf(discardFilter.data('attribute')), 1);
  }
  if(!filterAttribute.length) {
    selectedFiltersObj = {};
  }
  _self.createPillsDom(filterAttribute);
  _self.getSelectedFilters(selectedFiltersObj);
}
/**
* This function handles the selected filters.
* @param selectedFiltersObj uses to get selected filters category and attributes.
*/
FlexibleFilterHandler.prototype.getSelectedFilters = function _getSelectedFilters(selectedFiltersObj) {
  var _self = this;
  var viewMoreIndex = _self._tileElement.find('.js-filtered-room-list').data('view-more-index');
  var $viewMoreRoomElem = $(_self._tileElement.find('.js-view-more-rooms'));
  var representativeCount = $viewMoreRoomElem.data('view-more-count');
  // check if filter is reset or not
  if (Object.keys(selectedFiltersObj).length) {
    var matchedResult = _self._filter.getMatchedRoomLists(selectedFiltersObj);
    if (_self._renderer.renderRateListMenu(matchedResult, _self._tileElement.find('.js-filtered-room-list'), false)) {
      _self._tileElement.find('.js-initial-room-list').hide();
      _self._tileElement.find('.js-filtered-room-list').show();
      if (matchedResult.noMatchList.length > viewMoreIndex) {
        _self._tileElement.find('.js-view-more-rooms').addClass('js-filter-applied').show();
        _self._tileElement.find('.js-view-more-count').text(matchedResult.noMatchList.length - viewMoreIndex);
        _self.initialFilterCount = matchedResult.noMatchList.length - viewMoreIndex;
        _self._tileElement.find('.js-view-more-rooms').data('current-filter-count', matchedResult.noMatchList.length - viewMoreIndex);
      }
      else {
        _self._tileElement.find('.js-view-more-rooms').hide();
      }
    }
    _self.filteredResultElem = _self._tileElement.find('.js-filtered-room-list > .room-rate-results.is-hidden-container');
  }
  else {
    _self._tileElement.find('.js-view-more-count').text(_self._tileElement.find('.js-view-more-rooms').data('view-more-count'));
    _self._tileElement.find('.js-initial-room-list').show();
    _self._tileElement.find('.js-view-more-rooms').removeClass('js-filter-applied').show();
    _self._tileElement.find('.js-view-more-rooms').removeClass('js-no-hidden-match');
    _self._tileElement.find('.js-filtered-room-list').hide();
    _self._tileElement.find('.js-filtered-room-list').empty();
    $viewMoreRoomElem.find('.js-more-label').show();
    $viewMoreRoomElem.find('.js-less-label').hide();
    $viewMoreRoomElem.find('.js-view-more-count').text(representativeCount);

  }
  return true;
}
/**
* This function is called when the viwe port is tablet or mobile and required to open takeover on select all filter click
*/
FlexibleFilterHandler.prototype.addFiltersTakeOver = function _addFiltersTakeOver() {
  var _self = this;
  if (!_self._tileElement.find('.js-sort-takeover').hasClass('page-take-over')) {    
    _self.takeoverBlock.removeClass('is-hidden');
    _self.filterTakeover.init();
  }
}
/**
* This function is called when the viwe port is tablet or mobile and required to open takeover on select all filter click
*/
FlexibleFilterHandler.prototype.removeFiltersTakeover = function _removeFiltersTakeover() {
  var _self = this;
  if (_self._tileElement.find('.js-sort-takeover').hasClass('page-take-over')) {    
    _self.filterTakeover.remove();
  }
}

/**
* This function is called on view more room click it shows more rooms in the dom.
*/
FlexibleFilterHandler.prototype.viewMoreRooms = function _viewMoreRooms(event) {
  var _self = this;
  var $viewMoreRoomElem = $(_self._tileElement.find('.js-view-more-rooms'));
  var filterPaginationSize = $viewMoreRoomElem.data('filter-pagination');

  var currentFilterSize = +$viewMoreRoomElem.find('.js-view-more-count').html();
  var remainNoMatchSize;
  event.preventDefault();
  if ($viewMoreRoomElem.hasClass('js-filter-applied') ) {
    var totalFilteredRoomList = _self._tileElement.find('.js-filtered-room-list > .room-rate-results.is-hidden-container');
    if(currentFilterSize > filterPaginationSize) {
      totalFilteredRoomList.each(function(index, item){
        if(index < filterPaginationSize) {
          $(item).removeClass('is-hidden-container');
        }
      })
      remainNoMatchSize = currentFilterSize - filterPaginationSize;
      $viewMoreRoomElem.find('.js-view-more-count').text(remainNoMatchSize);
    }
    else {
      totalFilteredRoomList.each(function(index, item){
        $(item).removeClass('is-hidden-container');
      });
      $viewMoreRoomElem.find('.js-more-label').hide();
      $viewMoreRoomElem.find('.js-less-label').show();
      $viewMoreRoomElem.removeClass('js-filter-applied').addClass('js-no-hidden-match');
    }
    return true;
  }
  else if($viewMoreRoomElem.hasClass('js-no-hidden-match')) {
    $(_self.filteredResultElem).each(function(index, item) {
      $(item).addClass('is-hidden-container')
    });

    $viewMoreRoomElem.find('.js-more-label').show();
    $viewMoreRoomElem.find('.js-less-label').hide();
    $viewMoreRoomElem.find('.js-view-more-count').text(_self.initialFilterCount);
    $viewMoreRoomElem.removeClass('js-no-hidden-match');
    $viewMoreRoomElem.addClass('js-filter-applied');
    
  }
  else {
    var list = _self._filter.getViewMoreRoomList();
    if (list.length) {
      if (_self._renderer.renderRateListMenu(list, _self._tileElement.find('.js-filtered-room-list'), true)) {
        _self._tileElement.find('.js-initial-room-list').hide();
        _self._tileElement.find('.js-view-more-rooms').hide();
        _self._tileElement.find('.js-filtered-room-list').show();
        return true;
      }
    }
    return false;
  }
}
module.exports = FlexibleFilterHandler;
