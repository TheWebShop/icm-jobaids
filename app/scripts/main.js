require.config({
    // paths to dependencies
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
    // container for JSON data from SharePoint List
    var getJobAids = $.getJSON('/icm/_vti_bin/listdata.svc/JobAids?$expand=Topics')
        .pipe(function(data) {
            // take Turn data into all Title Case
            function toTitleCase(str) {
                return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
            }
            // take the file name and turn it into a title to be displayed
            function titleFromFileName(str) {
                var title = str.substr(0, str.lastIndexOf('.'));
                title = title.replace(/-/g,' ');
                title = toTitleCase(title);
                return title;
            }
            // pull specific elements out of the data (the ones that we want)
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
    // get list of Topics to be used for sorting feature
    var getTopics = $.getJSON('/icm/_vti_bin/listdata.svc/JobAidsTopics').pipe(function(data) {
        return _.pluck(data.d.results, 'Value');
    });

    // after the job aids data and the topics data have been returned, create a data map
    $.when(getJobAids, getTopics).done(function(jobaids, topics) {
        var allTpl = _.template($('#jobaids-table').html(), {
            jobaids: jobaids,
            topics: topics
        });

        // remove loader
        $('#loading-jobaids').remove();

        // show search bar
        $('#jobaids-all').append(allTpl).find('.search').show();

        var list = new List('jobaids-all', {
            valueNames: [
                'Title',
                'Topics',
                'Keywords',
                'Updated'
            ]
        });
        
        // replace all nulls in updated column with blanks and convert date objects to actual dates
        $(list.list).find('time').each(function() {
            var updated = $(this).text();
            if (updated === '') {
                $(this).text('');
            } else {
                $(this).text(moment(updated).format('l'));
            }
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

        $('#topic-select').on('change', function() {
            var topic = $(this).val();

            list.filter(function(item) {
                // if there is no filter or if the filter is among the item topics
                return !topic || item.values().Topics.indexOf(topic) !== -1;
            });
            $('#jobaid-search').attr('placeholder', 'Search from ' + list.matchingItems.length + ' JobAids...');
        });

        // setup table to display the job aids list
        function zebraTable(container){
            $(container).find('tr').each(function(i){
                var stripe = i%2? 'ms-rteTableOddRow-1': 'ms-rteTableEvenRow-1';
                // stripe odd rows for easy visibility
                $(this).removeClass('ms-rteTableOddRow-1 ms-rteTableOddRow-1').addClass(stripe);
            })
        }
    });
});
