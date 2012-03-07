# makeFilterable, Easy filtering for select fields or tables.
# by Adam Vaughan for Absolute Performance, http://absolute-performance.com
#
# Version 0.1.6
# Full source at https://github.com/absperf/make_filterable
# Copyright (c) 2011 Absolute Performance http://absolute-performance.com
#
# MIT License, https://github.com/absperf/make_filterable/blob/master/LICENSE.md
#
# To use with a select field, do
#   $('select').makeFilterable()
#
# This will add a small magnifying glass next to the select field. When the
# magnifying glass is clicked, popup will be displayed with a text field and
# all of the options that are in the select field. These options can be
# searched by entering text in the text field. The list can be navigated with
# the up/down arrows and options can be chosen by pressing enter or by
# clicking. When an option is chosen, the select field is updated to reflect
# the choice.
#
# The following options can be passed to the makeFilterable() call:
#   buttonClass, defaults to 'filterable-button'
#   dropdownClass, defaults to 'filterable-dropdown'
#   noMatchClass, defaults to 'filterable-no-match'
#   noMatchMessage, defaults to 'No Matches'
#   afterFilter, callback that is executed after the results are filtered
#
# To use with a list, do
#   $('ul').makeFilterable({searchField: 'input'})
#
# To use with a table, do
#   $('table').makeFilterable({searchField: 'input'})
#
# You must provide a field that will act as the search field. In addition, the
# following options can be passed to the makeFilterable() call:
#   valueSelector, defaults to 'td'
#   afterFilter, callback that is executed after the results are filtered
#
# This plugin was strongly influenced by https://github.com/harvesthq/chosen

$ = jQuery

$.fn.extend
  makeFilterable: (options = {}) ->
    # give up if using an unsupported browser
    return @ if $.browser.msie and ($.browser.version is '6.0' or $.browser.version is '7.0')

    $(@).each ->
      if $(@).is 'select'
        settings = $.extend {
            buttonClass: 'filterable-button'
            dropdownClass: 'filterable-dropdown'
            noMatchClass: 'filterable-no-match'
            noMatchMessage: 'No Matches'
          }, options

        new FilterableSelect(@, settings)
      else if $(@).is 'table'
        settings = $.extend {
            valueSelector: 'td'
          }, options

        if settings.searchField?
          new FilterableTable(@, settings)
        else
          console.log 'No search field provided for filtering table'
      else if $(@).is 'ul'
        if options.searchField?
          new FilterableList(@, options)
        else
          console.log 'No search field provided for filtering list'

class FilterableSelect
  constructor: (field, options) ->
    @field = $(field)
    @afterFilter = options.afterFilter

    @searchField = $('<input type="text" autocomplete="off">')
    @searchField.keyup @filterDropdown
    @searchField.keydown @navigateDropdown

    @noMatchMessage = $("<p class=\"#{options.noMatchClass}\" style=\"display: none\">#{options.noMatchMessage}</p>")

    @dropdownId = "filterable_dropdown_#{@getRandomId()}"

    @dropdown = $("<div id=\"#{@dropdownId}\" style=\"display: none\"><div class=\"filterable-input-container\"></div><ul></ul></div>")
    @dropdown.addClass options.dropdownClass
    @dropdown.attr 'id', @dropdownId
    @dropdown.find('div').append @searchField
    @dropdown.append @noMatchMessage

    @field.after @dropdown

    filterButton = $('<span></span>')
    filterButton.addClass options.buttonClass
    filterButton.click (event) =>
      event.preventDefault()
      event.stopPropagation()
      @toggleDropdown()

    @field.after filterButton

  toggleDropdown: =>
    @noMatchMessage.hide()
    @searchField.val ''

    if @dropdown.is ':visible'
      @hideDropdown()
    else
      @showDropdown()

  hideDropdown: =>
    @dropdown.hide()

    listItems = @dropdown.find 'ul li'
    listItems.unbind 'click', @itemClicked
    listItems.remove()

    $(document).unbind 'click', @documentClicked
    $(document).unbind 'filterableSelectOpen', @filterableSelectOpened
    $(window).unbind 'resize', @windowResized

    $(document).trigger 'filterableSelectClose', @dropdownId

  showDropdown: =>
    $(document).click @documentClicked
    $(document).bind 'filterableSelectOpen', @filterableSelectOpened
    $(window).resize @windowResized

    @populateDropdown()
    @positionDropdown()

    @dropdown.show()
    @searchField.focus()

    $(document).trigger 'filterableSelectOpen', @dropdownId

  populateDropdown: =>
    list = @dropdown.find 'ul'

    @field.find('option').each (index, option) =>
      text = $('<div />').text($(option).text()).html()
      value = $(option).val()

      if $.trim(value).length > 0
        list.append $("<li><p>#{text}</p><input type=\"hidden\" value=\"#{value}\"></li>")

    list.find('li').click @itemClicked

  positionDropdown: =>
    width = @field.outerWidth()
    height = @field.outerHeight()
    position = @field.position()
    top = position.top
    left = position.left

    @dropdown.css 'position', 'absolute'
    @dropdown.css 'width', 'auto'
    @dropdown.css 'min-width', "#{width - 2}px"
    @dropdown.css 'top', "#{top + height + 4}px"
    @dropdown.css 'left', "#{left}px"

  filterDropdown: (event) =>
    key = event.which ? event.keyCode

    switch key
      when 27 # escape
        @hideDropdown()
      when 9, 13, 16, 17, 18, 19, 38, 40, 91, 92
        # ignore these
      else
        clearTimeout(@filterTimer) if @filterTimer?
        @filterTimer = setTimeout @filterResults, 300

  filterResults: =>
    @dropdown.find('li.selected').removeClass 'selected'
    @noMatchMessage.hide()

    searchText = $.trim @searchField.val()

    if searchText.length == 0
      @dropdown.find('li').show()
    else
      regex = new RegExp searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i'
      matches = 0

      @dropdown.find('li').each (index, element) =>
        item = $(element)

        if regex.test item.text()
          item.show()
          matches += 1
        else
          item.hide()

      if matches > 0
        @selectFirstItem()
      else
        @noMatchMessage.show()

    @afterFilter(@field) if @afterFilter?

  applySelection: =>
    selected = @dropdown.find 'li.selected'

    if selected.length > 0
      @field.val selected.find('input[type=hidden]').val()
      @field.trigger 'change'
      @toggleDropdown()

  selectItem: (item) =>
    @dropdown.find('li.selected').removeClass 'selected'
    item.addClass 'selected'

  selectFirstItem: =>
    @selectItem @dropdown.find('li:visible').first()

  selectLastItem: =>
    @selectItem @dropdown.find('li:visible').last()

  selectNextItem: =>
    @selectItem $(@dropdown.find('li.selected').nextAll('li:visible')[0])

  selectPreviousItem: (currentSelectedItem) =>
    @selectItem $(@dropdown.find('li.selected').prevAll('li:visible')[0])

  navigateDropdown: (event) =>
    key = event.which ? event.keyCode
    selected = @dropdown.find 'li.selected'

    switch key
      when 13 # enter
        event.preventDefault()
        @applySelection()
      when 38 # up arrow
        if selected.length == 0 or selected.prevAll(':visible').length == 0
          @selectLastItem()
        else
          @selectPreviousItem()

        @scrollToSelectedResult()
      when 40 # down arrow
        if selected.length == 0 or selected.nextAll(':visible').length == 0
          @selectFirstItem()
        else
          @selectNextItem()

        @scrollToSelectedResult()

  scrollToSelectedResult: =>
    list = @dropdown.find 'ul'
    item = list.find 'li.selected'

    if item.length > 0
      scrollOffset = list.scrollTop()
      listTop = list.offset().top
      listBottom = list.height() + scrollOffset

      itemTop = item.offset().top - listTop + scrollOffset
      itemBottom = itemTop + item.height()

      if itemBottom > listBottom
        list.scrollTop(itemBottom - listBottom + scrollOffset)
      else if itemTop < scrollOffset
        list.scrollTop(itemTop)

  itemClicked: (event) =>
    event.preventDefault()
    @selectItem $(event.target).closest('li')
    @applySelection()

  windowResized: (event) =>
    clearTimeout(@resizeTimer) if @resizeTimer?
    @resizeTimer = setTimeout @positionDropdown, 300

  documentClicked: (event) =>
    if $(event.target).parents("##{@dropdownId}").length == 0
      @hideDropdown()

  filterableSelectOpened: (event, id)  =>
    @hideDropdown() unless @dropdownId == id

  getRandomId: ->
    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    id = for num in [1..10]
      rand = Math.floor(Math.random() * chars.length)
      newchar = chars.substring rand, rand + 1
    id.join ''

class FilterableList
  constructor: (element, options) ->
    @element = $(element)
    @afterFilter = options.afterFilter

    @searchField = $(options.searchField)
    @searchField.attr('autocomplete', 'off')
    @searchField.keyup @filter

  filter: (event) =>
    key = event.which ? event.keyCode

    switch key
      when 9, 13, 16, 17, 18, 19, 27, 38, 40, 91, 92
        # ignore these
      else
        clearTimeout(@filterTimer) if @filterTimer?
        @filterTimer = setTimeout @filterResults, 300

  filterResults: =>
    searchText = $.trim @searchField.val()

    if searchText.length == 0
      @element.find('li').show()
    else
      regex = new RegExp searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i'

      @element.find('li').each (index, row) =>
        $(row).hide()

        $(row).each (index, element) =>
          if regex.test $(element).text()
            $(element).show()

    @afterFilter(@element) if @afterFilter?

class FilterableTable extends FilterableList
  constructor: (element, options) ->
    super
    @valueSelector = options.valueSelector

  filterResults: =>
    searchText = $.trim @searchField.val()

    if searchText.length == 0
      @element.find('tbody tr').show()
    else
      regex = new RegExp searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i'

      @element.find('tbody tr').each (index, row) =>
        $(row).hide()

        $(row).find(@valueSelector).each (index, element) =>
          if regex.test $(element).text()
            $(element).parents('tr').show()

    @afterFilter(@element) if @afterFilter?
