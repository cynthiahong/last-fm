var app = angular.module('app', []);

app.factory('lastfm', ['$http', function ($http) {

  var apiKey = '9e421941650f3e6d9058baf8d69d4df9';

  var getTopTags = function () {
    var url = 'http://ws.audioscrobbler.com/2.0/';
    return $http.get(url, {
      params: {
        method: 'chart.gettoptags', 
        api_key: apiKey,
        format:'json'
      }
    });
  };

  var getTopArtists = function (tag) {
    var url = 'http://ws.audioscrobbler.com/2.0/';
    return $http.get(url, {
      params: {
        method: 'tag.gettopartists',
        api_key: apiKey,
        tag: tag,
        format:'json'
      }
    });
  };

  return {
    topTags: function () { return getTopTags() },
    topArtists: function (tag) { return getTopArtists(tag) }
  };
}]);

app.controller('lastfmCtrl', ['$scope','lastfm', function ($scope, lastfm) {
  $scope.tagsize = 'reach';
  $scope.toptags = [];
  $scope.artists = [];

  lastfm.topTags()
    .success(function (res) {
      if (res.error) {
        throw new Error(res.message);
      } else {
        $scope.toptags = res.tags.tag.map(function (t) {
          t.reach    = +t.reach;
          t.taggings = +t.taggings;
          return t;
        });

        // lastfm.topArtists($scope.toptags[0].name)
        //   .success(function (res) {
        //     if (res.error) {
        //       throw new Error(res.message);
        //     } else {
        //       $scope.artists = res.topartists.artist.map(function (a) {
        //         a.genre = $scope.toptags[0].name;
        //         a.arank = +a['@attr'].rank;
        //         return a;
        //       });
        //     }
        //   });
      }
    });
}]);

app.directive('toptagChart', ['lastfm', function (lastfm) {

  var link = function ($scope, $el, $attrs) {
    var diameter = 500;

    var bubble = d3.layout.pack()
      .sort(null)
      .size([diameter, diameter])
      .padding(2.5);

    var svg = d3.select($el[0])
      .append("svg")
        .attr("width", diameter)
        .attr("height", diameter);

    svg.append("text").attr("id", "loading")
      .text("Loading...")
      .attr("transform", "translate(200,250)");

    var update = function () {
      var data = $scope.toptags.map(function (d) {
        d.value = d[$scope.tagsize];
        return d;
      });

      bubble.nodes({children: data});

      if (data.length) svg.select("#loading").remove();

      var selection = svg.selectAll(".node")
        .data(data);

      var enter = selection.enter()
        .append("g").attr("class", "node")
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

      enter.append("title")
        .text(function (d) { return d.name; });

      enter.append("circle")
        .attr("r", function (d) { return d.r; })
        .style("fill", '#614a4a')
        .on("click", function (d) {

          svg.selectAll("circle").style("fill", "#614a4a");
          d3.select(this).style("fill", "lightgrey");

          lastfm.topArtists(d.name)
            .success(function (res) {
              if (res.error) {
                throw new Error(res.message);
              } else {
                var artists = res.topartists.artist.map(function (a) {
                  a.genre = d.name;
                  a.arank = +a['@attr'].rank;
                  return a;
                });
                $scope.artists = artists;
              }
            });
        });

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name; });

      selection.transition().duration(2000)
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

      selection.selectAll("circle").transition().duration(3000)
        .attr("r", function (d) { return d.r; });
    };

    $scope.$watch('tagsize', update);
    $scope.$watch('toptags', update);

  };
  return {
    template: '<div class="col-sm-12 col-md-6 col-lg-6"></div>',
    replace: true,
    scope: {toptags: '=', artists: '=', tagsize: '='}, 
    link: link, 
    restrict: 'E' 
  };

}]);

app.directive('artistsChart', function () {

  var link = function ($scope, $el, $attrs) {
    var msize = [500, 500], radius = 22;

    var svg = d3.select($el[0])
      .append("svg")
      .attr({width: msize[0], height: msize[1]});

    var coords = function (position) {
      var x, y;
      x = ((position - 1) % 5) * 100;
      y = (Math.ceil(position / 5)) * 45;
      return {x: x, y: y};
    }

    var transform = function (d) {
      var c = coords(d.arank);
      return "translate(" + (c.x + radius + 30) + "," + c.y + ")"; 
    };

    svg.selectAll(".number")
      .data(d3.range(1,51)).enter()
      .append("text")
        .attr("class", "number")
        .style("text-anchor", "middle")
        .text(function (d) { return d; })
        .attr("transform", function (d) {
          var c = coords(d);
          return "translate(" + (c.x + radius + 30) + "," + (c.y + 12) + ")";
        }); 

    var update = function () {
      var data = $scope.artists.map(function (d) {
        d.value = 10;
        return d;
      });

      var selection = svg.selectAll(".node")
        .data(data, function (d) { return d.name; });

      var enter = selection.enter()
        .append("g")
          .attr("class", "node")
          .style("opacity", 0)
          .attr("transform", transform); 

      enter.append("circle")
        .attr("r", 5)
        .style("fill", "#696758")

      enter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) { return d.name.slice(0,15); });

      selection.transition().duration(3000)
        .style("opacity", 1)
        .attr("transform", transform);

      selection.selectAll("circle")
        .transition().duration(3000)
        .attr("r", radius);

      var exit = selection.exit()
      exit.transition().duration(1000)
        .attr("transform", function (d) {
          return "translate(" + 1000 + "," + 1000 + ")"; 
        }).remove();
    };

    $scope.$watch('artists', update);
  };
  return {
    template: '<div class="col-sm-12 col-md-6 col-lg-6"></div>',
    replace: true,
    scope: {artists: '='},
    link: link, 
    restrict: 'E'
  };
});