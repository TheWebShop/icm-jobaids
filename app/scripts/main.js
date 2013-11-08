require.config({
    paths: {
        jquery: '../bower_components/jquery/jquery',
        underscore: '../bower_components/underscore/underscore',
        listjs: '../bower_components/listjs/src/list',
        moment: '../bower_components/momentjs/moment',
        placeholder: '../bower_components/placeholder/js/placeholder'
    },
    shim: {
        'listjs': {
            exports: 'List'
        },
        'underscore': {
            exports: '_',
            init: function() {
                // the default underscore template tags <%= %> and <% %>
                // are interpretted as code blocks on .aspx pages
                // so we use {{}} and {[]} instead
                _.templateSettings = {
                     evaluate : /\{\[([\s\S]+?)\]\}/g,
                     interpolate : /\{\{([\s\S]+?)\}\}/g
                };
            }
        }
    }
});

require(['jquery', 'underscore', 'listjs', 'moment', 'placeholder'], function($, _, List, moment, Placeholder) {
    'use strict';
    var getList = $.getJSON('/tools/communicationstools/_vti_bin/listdata.svc/Acronyms')
        .pipe(function(data) {
            var list = _.map(data.d.results, function(el) {
                return el;
            });
            list.categories = _.uniq(_.map(data.d.results, function(el) {
                return el.Category;
            }));
            return list;
        });

    $.when(getList).done(function(list) {
        var allTpl = _.template($('#list-table').html(), {
            list: list,
            categories: list.categories
        });

        $('#loading-list').remove();
        $('#list-all').append(allTpl).find('.search').show();

        var list = new List('list-all', {
            valueNames: [
                'Acronym',
                'Definition',
                'Category'
            ]
        });

        zebraTable(list.list);
        list.on('updated', function() {
            zebraTable(list.list);
            // If empty show not found message and hide the table head.
            $('.table thead').toggle(list.matchingItems.length !== 0);
            $('#search-notfound').toggle(list.matchingItems.length === 0);
        });

        // now that the <input> is on the stage we can polyfil for IE8
        if(!Modernizr.input.placeholder) window.placeholder = new Placeholder();

        $('#category-select').on('change', function() {
            var cat = $(this).val();

            list.filter(function(item) {
                // if there is no filter or if the filter is among the item topics
                return !cat || item.values().Category.indexOf(cat) !== -1;
            });
            $('#list-search').attr('placeholder', 'Search from ' + list.matchingItems.length + ' Acronyms...');
        });

        function zebraTable(container){
            $(container).find('tr').each(function(i){
                var stripe = i%2? 'ms-rteTableOddRow-1': 'ms-rteTableEvenRow-1';
                $(this).removeClass('ms-rteTableOddRow-1 ms-rteTableOddRow-1').addClass(stripe);
            })
        }
    });
});
