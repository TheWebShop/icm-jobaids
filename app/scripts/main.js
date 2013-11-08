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
    var getJobAids = $.getJSON('/icm/_vti_bin/listdata.svc/JobAids?$expand=Topics')
        .pipe(function(data) {
            function toTitleCase(str) {
                return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
            }
            function titleFromFileName(str) {
                var title = str.substr(0, str.lastIndexOf('.'));
                title = title.replace(/-/g,' ');
                title = toTitleCase(title);
                return title;
            }
            var jobaids = _.map(data.d.results, function(el) {
                el.Title = el.Title || titleFromFileName(el.Name);
                el.Topics = _.map(el.Topics.results, function(topic) {
                    return topic.Value;
                }).join(', ');
                return el;
            });
            jobaids = _.sortBy(jobaids, 'Title');
            return jobaids = _.sortBy(jobaids, 'Topics');
        });
    var getTopics = $.getJSON('/icm/_vti_bin/listdata.svc/JobAidsTopics').pipe(function(data) {
        return _.pluck(data.d.results, 'Value');
    });

    $.when(getJobAids, getTopics).done(function(jobaids, topics) {
        var allTpl = _.template($('#jobaids-table').html(), {
            jobaids: jobaids,
            topics: topics
        });

        $('#loading-jobaids').remove();
        $('#jobaids-all').append(allTpl).find('.search').show();

        var list = new List('jobaids-all', {
            valueNames: [
                'Title',
                'Topics',
                'Modified'
            ]
        });
        $(list.list).find('time').each(function() {
            var updated = $(this).text();
            $(this).text(moment(updated).fromNow());
        })

        zebraTable(list.list);
        list.on('updated', function() {
            zebraTable(list.list);
            // If empty show not found message and hide the table head.
            $('.table thead').toggle(list.matchingItems.length !== 0);
            $('#search-notfound').toggle(list.matchingItems.length === 0);
        });

        // now that the <input> is on the stage we can polyfil for IE8
        if(!Modernizr.input.placeholder) window.placeholder = new Placeholder();

        $('#topic-select').on('change', function() {
            var topic = $(this).val();

            list.filter(function(item) {
                // if there is no filter or if the filter is among the item topics
                return !topic || item.values().Topics.indexOf(topic) !== -1;
            });
            $('#jobaid-search').attr('placeholder', 'Search from ' + list.matchingItems.length + ' JobAids...');
        });

        function zebraTable(container){
            $(container).find('tr').each(function(i){
                var stripe = i%2? 'ms-rteTableOddRow-1': 'ms-rteTableEvenRow-1';
                $(this).removeClass('ms-rteTableOddRow-1 ms-rteTableOddRow-1').addClass(stripe);
            })
        }
    });
});
