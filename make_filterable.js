// makeFilterable, Easy filtering for select fields or tables.
// by Adam Vaughan for Absolute Performance, http://absolute-performance.com
//
// Version 0.1.6
// Full source at https://github.com/absperf/make_filterable
// Copyright (c) 2011 Absolute Performance http://absolute-performance.com
//
// MIT License, https://github.com/absperf/make_filterable/blob/master/LICENSE.md
//
// To use with a select field, do
//   $('select').makeFilterable()
//
// This will add a small magnifying glass next to the select field. When the
// magnifying glass is clicked, popup will be displayed with a text field and
// all of the options that are in the select field. These options can be
// searched by entering text in the text field. The list can be navigated with
// the up/down arrows and options can be chosen by pressing enter or by
// clicking. When an option is chosen, the select field is updated to reflect
// the choice.
//
// The following options can be passed to the makeFilterable() call:
//   buttonClass, defaults to 'filterable-button'
//   dropdownClass, defaults to 'filterable-dropdown'
//   noMatchClass, defaults to 'filterable-no-match'
//   noMatchMessage, defaults to 'No Matches'
//   afterFilter, callback that is executed after the results are filtered
//
// To use with a list, do
//   $('ul').makeFilterable({searchField: 'input'})
//
// To use with a table, do
//   $('table').makeFilterable({searchField: 'input'})
//
// You must provide a field that will act as the search field. In addition, the
// following options can be passed to the makeFilterable() call:
//   valueSelector, defaults to 'td'
//   afterFilter, callback that is executed after the results are filtered
//
// This plugin was strongly influenced by https://github.com/harvesthq/chosen

(function() {
  var $, FilterableList, FilterableSelect, FilterableTable,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  $.fn.extend({
    makeFilterable: function(options) {
      if (options == null) options = {};
      if ($.browser.msie && ($.browser.version === '6.0' || $.browser.version === '7.0')) {
        return this;
      }
      return $(this).each(function() {
        var settings;
        if ($(this).is('select')) {
          settings = $.extend({
            buttonClass: 'filterable-button',
            dropdownClass: 'filterable-dropdown',
            noMatchClass: 'filterable-no-match',
            noMatchMessage: 'No Matches'
          }, options);
          return new FilterableSelect(this, settings);
        } else if ($(this).is('table')) {
          settings = $.extend({
            valueSelector: 'td'
          }, options);
          if (settings.searchField != null) {
            return new FilterableTable(this, settings);
          } else {
            return console.log('No search field provided for filtering table');
          }
        } else if ($(this).is('ul')) {
          if (options.searchField != null) {
            return new FilterableList(this, options);
          } else {
            return console.log('No search field provided for filtering list');
          }
        }
      });
    }
  });

  FilterableSelect = (function() {

    function FilterableSelect(field, options) {
      this.filterableSelectOpened = __bind(this.filterableSelectOpened, this);
      this.documentClicked = __bind(this.documentClicked, this);
      this.windowResized = __bind(this.windowResized, this);
      this.itemClicked = __bind(this.itemClicked, this);
      this.scrollToSelectedResult = __bind(this.scrollToSelectedResult, this);
      this.navigateDropdown = __bind(this.navigateDropdown, this);
      this.selectPreviousItem = __bind(this.selectPreviousItem, this);
      this.selectNextItem = __bind(this.selectNextItem, this);
      this.selectLastItem = __bind(this.selectLastItem, this);
      this.selectFirstItem = __bind(this.selectFirstItem, this);
      this.selectItem = __bind(this.selectItem, this);
      this.applySelection = __bind(this.applySelection, this);
      this.filterResults = __bind(this.filterResults, this);
      this.filterDropdown = __bind(this.filterDropdown, this);
      this.positionDropdown = __bind(this.positionDropdown, this);
      this.populateDropdown = __bind(this.populateDropdown, this);
      this.showDropdown = __bind(this.showDropdown, this);
      this.hideDropdown = __bind(this.hideDropdown, this);
      this.toggleDropdown = __bind(this.toggleDropdown, this);
      var filterButton,
        _this = this;
      this.field = $(field);
      this.afterFilter = options.afterFilter;
      this.searchField = $('<input type="text" autocomplete="off">');
      this.searchField.keyup(this.filterDropdown);
      this.searchField.keydown(this.navigateDropdown);
      this.noMatchMessage = $("<p class=\"" + options.noMatchClass + "\" style=\"display: none\">" + options.noMatchMessage + "</p>");
      this.dropdownId = "filterable_dropdown_" + (this.getRandomId());
      this.dropdown = $("<div id=\"" + this.dropdownId + "\" style=\"display: none\"><div class=\"filterable-input-container\"></div><ul></ul></div>");
      this.dropdown.addClass(options.dropdownClass);
      this.dropdown.attr('id', this.dropdownId);
      this.dropdown.find('div').append(this.searchField);
      this.dropdown.append(this.noMatchMessage);
      this.field.after(this.dropdown);
      filterButton = $('<span></span>');
      filterButton.addClass(options.buttonClass);
      filterButton.click(function(event) {
        event.preventDefault();
        event.stopPropagation();
        return _this.toggleDropdown();
      });
      this.field.after(filterButton);
    }

    FilterableSelect.prototype.toggleDropdown = function() {
      this.noMatchMessage.hide();
      this.searchField.val('');
      if (this.dropdown.is(':visible')) {
        return this.hideDropdown();
      } else {
        return this.showDropdown();
      }
    };

    FilterableSelect.prototype.hideDropdown = function() {
      var listItems;
      this.dropdown.hide();
      listItems = this.dropdown.find('ul li');
      listItems.unbind('click', this.itemClicked);
      listItems.remove();
      $(document).unbind('click', this.documentClicked);
      $(document).unbind('filterableSelectOpen', this.filterableSelectOpened);
      $(window).unbind('resize', this.windowResized);
      return $(document).trigger('filterableSelectClose', this.dropdownId);
    };

    FilterableSelect.prototype.showDropdown = function() {
      $(document).click(this.documentClicked);
      $(document).bind('filterableSelectOpen', this.filterableSelectOpened);
      $(window).resize(this.windowResized);
      this.populateDropdown();
      this.positionDropdown();
      this.dropdown.show();
      this.searchField.focus();
      return $(document).trigger('filterableSelectOpen', this.dropdownId);
    };

    FilterableSelect.prototype.populateDropdown = function() {
      var list,
        _this = this;
      list = this.dropdown.find('ul');
      this.field.find('option').each(function(index, option) {
        var text, value;
        text = $('<div />').text($(option).text()).html();
        value = $(option).val();
        if ($.trim(value).length > 0) {
          return list.append($("<li><p>" + text + "</p><input type=\"hidden\" value=\"" + value + "\"></li>"));
        }
      });
      return list.find('li').click(this.itemClicked);
    };

    FilterableSelect.prototype.positionDropdown = function() {
      var height, left, position, top, width;
      width = this.field.outerWidth();
      height = this.field.outerHeight();
      position = this.field.position();
      top = position.top;
      left = position.left;
      this.dropdown.css('position', 'absolute');
      this.dropdown.css('width', 'auto');
      this.dropdown.css('min-width', "" + (width - 2) + "px");
      this.dropdown.css('top', "" + (top + height + 4) + "px");
      return this.dropdown.css('left', "" + left + "px");
    };

    FilterableSelect.prototype.filterDropdown = function(event) {
      var key, _ref;
      key = (_ref = event.which) != null ? _ref : event.keyCode;
      switch (key) {
        case 27:
          return this.hideDropdown();
        case 9:
        case 13:
        case 16:
        case 17:
        case 18:
        case 19:
        case 38:
        case 40:
        case 91:
        case 92:
          break;
        default:
          if (this.filterTimer != null) clearTimeout(this.filterTimer);
          return this.filterTimer = setTimeout(this.filterResults, 300);
      }
    };

    FilterableSelect.prototype.filterResults = function() {
      var matches, regex, searchText,
        _this = this;
      this.dropdown.find('li.selected').removeClass('selected');
      this.noMatchMessage.hide();
      searchText = $.trim(this.searchField.val());
      if (searchText.length === 0) {
        this.dropdown.find('li').show();
      } else {
        regex = new RegExp(searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');
        matches = 0;
        this.dropdown.find('li').each(function(index, element) {
          var item;
          item = $(element);
          if (regex.test(item.text())) {
            item.show();
            return matches += 1;
          } else {
            return item.hide();
          }
        });
        if (matches > 0) {
          this.selectFirstItem();
        } else {
          this.noMatchMessage.show();
        }
      }
      if (this.afterFilter != null) return this.afterFilter(this.field);
    };

    FilterableSelect.prototype.applySelection = function() {
      var selected;
      selected = this.dropdown.find('li.selected');
      if (selected.length > 0) {
        this.field.val(selected.find('input[type=hidden]').val());
        this.field.trigger('change');
        return this.toggleDropdown();
      }
    };

    FilterableSelect.prototype.selectItem = function(item) {
      this.dropdown.find('li.selected').removeClass('selected');
      return item.addClass('selected');
    };

    FilterableSelect.prototype.selectFirstItem = function() {
      return this.selectItem(this.dropdown.find('li:visible').first());
    };

    FilterableSelect.prototype.selectLastItem = function() {
      return this.selectItem(this.dropdown.find('li:visible').last());
    };

    FilterableSelect.prototype.selectNextItem = function() {
      return this.selectItem($(this.dropdown.find('li.selected').nextAll('li:visible')[0]));
    };

    FilterableSelect.prototype.selectPreviousItem = function(currentSelectedItem) {
      return this.selectItem($(this.dropdown.find('li.selected').prevAll('li:visible')[0]));
    };

    FilterableSelect.prototype.navigateDropdown = function(event) {
      var key, selected, _ref;
      key = (_ref = event.which) != null ? _ref : event.keyCode;
      selected = this.dropdown.find('li.selected');
      switch (key) {
        case 13:
          event.preventDefault();
          return this.applySelection();
        case 38:
          if (selected.length === 0 || selected.prevAll(':visible').length === 0) {
            this.selectLastItem();
          } else {
            this.selectPreviousItem();
          }
          return this.scrollToSelectedResult();
        case 40:
          if (selected.length === 0 || selected.nextAll(':visible').length === 0) {
            this.selectFirstItem();
          } else {
            this.selectNextItem();
          }
          return this.scrollToSelectedResult();
      }
    };

    FilterableSelect.prototype.scrollToSelectedResult = function() {
      var item, itemBottom, itemTop, list, listBottom, listTop, scrollOffset;
      list = this.dropdown.find('ul');
      item = list.find('li.selected');
      if (item.length > 0) {
        scrollOffset = list.scrollTop();
        listTop = list.offset().top;
        listBottom = list.height() + scrollOffset;
        itemTop = item.offset().top - listTop + scrollOffset;
        itemBottom = itemTop + item.height();
        if (itemBottom > listBottom) {
          return list.scrollTop(itemBottom - listBottom + scrollOffset);
        } else if (itemTop < scrollOffset) {
          return list.scrollTop(itemTop);
        }
      }
    };

    FilterableSelect.prototype.itemClicked = function(event) {
      event.preventDefault();
      this.selectItem($(event.target).closest('li'));
      return this.applySelection();
    };

    FilterableSelect.prototype.windowResized = function(event) {
      if (this.resizeTimer != null) clearTimeout(this.resizeTimer);
      return this.resizeTimer = setTimeout(this.positionDropdown, 300);
    };

    FilterableSelect.prototype.documentClicked = function(event) {
      if ($(event.target).parents("#" + this.dropdownId).length === 0) {
        return this.hideDropdown();
      }
    };

    FilterableSelect.prototype.filterableSelectOpened = function(event, id) {
      if (this.dropdownId !== id) return this.hideDropdown();
    };

    FilterableSelect.prototype.getRandomId = function() {
      var chars, id, newchar, num, rand;
      chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      id = (function() {
        var _results;
        _results = [];
        for (num = 1; num <= 10; num++) {
          rand = Math.floor(Math.random() * chars.length);
          _results.push(newchar = chars.substring(rand, rand + 1));
        }
        return _results;
      })();
      return id.join('');
    };

    return FilterableSelect;

  })();

  FilterableList = (function() {

    function FilterableList(element, options) {
      this.filterResults = __bind(this.filterResults, this);
      this.filter = __bind(this.filter, this);      this.element = $(element);
      this.afterFilter = options.afterFilter;
      this.searchField = $(options.searchField);
      this.searchField.attr('autocomplete', 'off');
      this.searchField.keyup(this.filter);
    }

    FilterableList.prototype.filter = function(event) {
      var key, _ref;
      key = (_ref = event.which) != null ? _ref : event.keyCode;
      switch (key) {
        case 9:
        case 13:
        case 16:
        case 17:
        case 18:
        case 19:
        case 27:
        case 38:
        case 40:
        case 91:
        case 92:
          break;
        default:
          if (this.filterTimer != null) clearTimeout(this.filterTimer);
          return this.filterTimer = setTimeout(this.filterResults, 300);
      }
    };

    FilterableList.prototype.filterResults = function() {
      var regex, searchText,
        _this = this;
      searchText = $.trim(this.searchField.val());
      if (searchText.length === 0) {
        this.element.find('li').show();
      } else {
        regex = new RegExp(searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');
        this.element.find('li').each(function(index, row) {
          $(row).hide();
          return $(row).each(function(index, element) {
            if (regex.test($(element).text())) return $(element).show();
          });
        });
      }
      if (this.afterFilter != null) return this.afterFilter(this.element);
    };

    return FilterableList;

  })();

  FilterableTable = (function(_super) {

    __extends(FilterableTable, _super);

    function FilterableTable(element, options) {
      this.filterResults = __bind(this.filterResults, this);      FilterableTable.__super__.constructor.apply(this, arguments);
      this.valueSelector = options.valueSelector;
    }

    FilterableTable.prototype.filterResults = function() {
      var regex, searchText,
        _this = this;
      searchText = $.trim(this.searchField.val());
      if (searchText.length === 0) {
        this.element.find('tbody tr').show();
      } else {
        regex = new RegExp(searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');
        this.element.find('tbody tr').each(function(index, row) {
          $(row).hide();
          return $(row).find(_this.valueSelector).each(function(index, element) {
            if (regex.test($(element).text())) {
              return $(element).parents('tr').show();
            }
          });
        });
      }
      if (this.afterFilter != null) return this.afterFilter(this.element);
    };

    return FilterableTable;

  })(FilterableList);

}).call(this);
