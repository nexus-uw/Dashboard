'use strict';
/*global _:false */

/*
* googleBigQueryService: handles data retrieval from Google Big Query Service
*/

angular.module('dashboard')
.factory('googleBigQueryService', ['$q','$http','API_ROOT','queryHelpersService',
 function($q,$http,API_ROOT,queryHelpersService) {
  var service = {};

  //Query for the data points for the 'Active Display 30 Days Map' metric
  //returns a promise that resolves to the query result
  service.getActiveDisplaysForMap = function() {
    var deferred = $q.defer();

    $http.get(API_ROOT+'/query/googleBigQuery/getActiveDisplaysForMap',{timeout:60000})
      .then(function(response){
        var result = response.data;
        if(result.error || !result.jobComplete){
          deferred.reject(result.error || 'big query job failed to complete');
          return;
        }
        try{
          deferred.resolve(_.map(result.rows,function(row) {
              return {
                id : row.f[0].v,
                lat : row.f[1].v,
                lng : row.f[2].v 
              };
            }
          ));
        }catch(e){
          deferred.reject(e);
        }
      })
      .then(null,function(error){
        deferred.reject(error);
      });

    return deferred.promise;
  };//getActiveDisplaysForMap

  //Query for the data points for 'Active Displays per Day' metric
  //returns a promise that resolves to the query result for display
  // Today (how many new Active Displays have been added to the Average Active Displays today)
  // Yesterday (how many new Active Displays were added to the Average Active Displays yesterday)
  // Growth MTD (# of new Active Displays added to the Average Active Displays  this month to date / total of the Average Active Displays as of last month * 100)
  // Growth Last Month (# of new Active Displays added to the Average Active Displays last month (does not include current month) / total of the Average Active Displays as of previous month * 100)
  // Growth Last 3 Months (# of new Active Displays added for last 3 months (does not include current month) / total of the Average Active Displays as of previous month (4 months ago)  * 100)
  // Growth Last 12 Months (# of new Active Displays added  to the Average Active Displays for last 12 months (does not include current month)
  //      / total of  the Average Active Displays as of previous month (13 months ago)  * 100)
  service.getActiveDisplaysForLineChart = function(){
    var deferred = $q.defer();
    
   $http.get(API_ROOT+'/query/googleBigQuery/getActiveDisplaysForLineChart',{timeout:60000})
       .then(function(response){
          var result = response.data;
          if(result.error|| !result.jobComplete){
            deferred.reject(result.error || 'big query job failed to complete');
            return;
          }
            
            
            var displays = _.map(result.rows,
                              function(item){
                                 return { 
                                    x : queryHelpersService.parseSlashDate(item.f[0].v),
                                    y : Math.round(parseInt(item.f[1].v))
                                  };
                              });
            var averageDisplays = queryHelpersService.calculateNormalizedValues(displays,30);
            var todayCount = 0
            , yesterdayCount = 0
            , twoDaysAgoCount = 0
            , lastMonthCount = 0
            , last2MonthsAgoCount = 0
            , last4MonthsAgoCount = 0
            , last13MonthsAgoCount = 0;
            

            var today = new Date();
            var yesterday = new Date();yesterday.setDate(yesterday.getDate() -1);
            var twoDaysAgo = new Date();twoDaysAgo.setDate(twoDaysAgo.getDate() -2);
            var lastDayOfLastMonth = new Date(); lastDayOfLastMonth.setDate(0);
            var lastDayOf2MonthsAgo = queryHelpersService.getMonthsAgo(1); lastDayOf2MonthsAgo.setDate(0);
            var lastDayOf3MonthsAgo = queryHelpersService.getMonthsAgo(2); lastDayOf3MonthsAgo.setDate(0);
            var lastDayOf4MonthsAgo = queryHelpersService.getMonthsAgo(3); lastDayOf4MonthsAgo.setDate(0);
            var lastDayOf13MonthsAgo = queryHelpersService.getMonthsAgo(12); lastDayOf13MonthsAgo.setDate(0);

            
            _.forEach(averageDisplays,function(result){
                if(queryHelpersService.equalDate(result.x, today)) {
                  todayCount = result.y;
                } 
                else if(queryHelpersService.equalDate(result.x, yesterday)) {
                  yesterdayCount = result.y;
                }
                else if(queryHelpersService.equalDate(result.x, twoDaysAgo)) {
                  twoDaysAgoCount = result.y;
                }else if(queryHelpersService.equalDate(result.x, lastDayOfLastMonth)) {
                  lastMonthCount = result.y;
                }else if (queryHelpersService.equalDate(result.x, lastDayOf2MonthsAgo)){
                  last2MonthsAgoCount = result.y;
                }else if (queryHelpersService.equalDate(result.x, lastDayOf4MonthsAgo)) {
                  last4MonthsAgoCount = result.y;
                }else if (queryHelpersService.equalDate(result.x, lastDayOf13MonthsAgo)) {
                  last13MonthsAgoCount = result.y;
                }
            });           

            deferred.resolve({
                                byDay : [
                                          { key : "Actual", values : displays },
                                          { key : "Average", values : averageDisplays }
                                        ],
                                today : todayCount - yesterdayCount,
                                yesterday : yesterdayCount - twoDaysAgoCount,
                                total : todayCount,
                                thisMonth : (todayCount - lastMonthCount) / lastMonthCount * 100,
                                lastMonth : (lastMonthCount - last2MonthsAgoCount) / last2MonthsAgoCount * 100,
                                last3Months : (lastMonthCount - last4MonthsAgoCount) / last4MonthsAgoCount * 100,
                                last12Months : (lastMonthCount - last13MonthsAgoCount) / last13MonthsAgoCount * 100,
                              });
          
       })
      .then(null,function(error){
        deferred.reject(error);
      });
    return deferred.promise;    
  };
//gets the data for a Line chart of total new Companies to Date, by Day. Below the line chart, and as part of the same widget, show 6 fields below the line chart with summary (1 number) stats:
// Today (how many new Companies have been added today)
// Yesterday (how many new Companies were added yesterday)
// total (total number of new companies)
// Growth MTD (# of new Companies this month to date / total as of last month * 100)
// Growth Last Month (# of new Companies added last month (does not include current month) / total as of previous month * 100)
// Growth Last 3 Months (# of new Companies added for last 3 months (does not include current month) / total as of previous month (4 months ago)  * 100)
// Growth Last 12 Months (# of new Companies added for last 12 months (does not include current month) / total as of previous month (13 months ago)  * 100)
  service.getNewCompaniesByDay = function() {
    var deferred = $q.defer();
    $q.all([
            $http.get(API_ROOT + '/query/googleBigQuery/getNewCompaniesByDay',{timeout:45000}),
            $http.get(API_ROOT + '/query/googleBigQuery/getTotalCompaniesByMonth',{timeout:45000}),
          ])
      .then(function(results) {
        var res = results[0];
        var res2 = results[1];
        var errorMsg = '';
        _.forEach(results,
          function(item){
            if(item.data.error) { 
              errorMsg += item.data.error + '. ';
            }
            else if(!item.data.jobComplete){
             errorMsg += 'bigquery job('+item.config.url+') failed to complete. ';
            }
        });
        if(errorMsg.length > 0) {
          deferred.reject(errorMsg);
          return;
        }

        var todayCount = 0
          , yesterdayCount = 0
          , thisMonthCount = 0
          , lastMonthCount = 0
          , last3MonthsCount = 0
          , last12MonthsCount = 0
          , totalCount = 0
          , previousMonthTotalCompanies = 0
          , twoMonthsAgoTotalCompanies = 0
          , fourMonthsAgoTotalCompanies = 0
          , thirteenMonthsAgoTotalCompanies = 0;
          
        var today = new Date();
        var yesterday = new Date();yesterday.setDate(yesterday.getDate() -1);
        var thisMonth = queryHelpersService.getMonthsAgo(0)
         ,  lastMonth = queryHelpersService.getMonthsAgo(1)
         ,  twoMonths = queryHelpersService.getMonthsAgo(2)
         , fourMonths = queryHelpersService.getMonthsAgo(4) 
         , fiveMonths = queryHelpersService.getMonthsAgo(5) 
         , thirteenMonths = queryHelpersService.getMonthsAgo(13)
         , fourteenMonths = queryHelpersService.getMonthsAgo(14);
        var byDay = _.map(res.data.rows,
                           function(item){
                            var result = {
                              x : queryHelpersService.parseSlashDate(item.f[0].v),
                              y : parseInt(item.f[1].v)
                            };

                            //SR note: while bigquery will only return only return 1 record per day, for unit testing simplisty purposes, there may be more than 1 entry
                            if( result.x.getFullYear() === today.getFullYear() &&
                                result.x.getMonth() === today.getMonth() &&
                                result.x.getDate() === today.getDate()) {
                              todayCount += result.y;
                            } 
                            if(result.x.getFullYear() === yesterday.getFullYear() &&
                                result.x.getMonth() === yesterday.getMonth() &&
                                result.x.getDate() === yesterday.getDate()){
                              yesterdayCount += result.y;
                            }
                            if(result.x.getFullYear() === thisMonth.getFullYear() &&
                                result.x.getMonth() === thisMonth.getMonth()){
                              thisMonthCount += result.y;
                            }
                            if(result.x.getFullYear() === lastMonth.getFullYear() &&
                                result.x.getMonth() === lastMonth.getMonth()){
                              lastMonthCount += result.y;
                            }
                            
                            //do not include current month 
                            if(((result.x.getFullYear() === fourMonths.getFullYear() &&
                                result.x.getMonth() >= fourMonths.getMonth()) ||
                                (result.x.getFullYear() > fourMonths.getFullYear() )) &&                                                          
                                ((result.x.getFullYear() === thisMonth.getFullYear() &&
                                result.x.getMonth() < thisMonth.getMonth()) ||
                                (result.x.getFullYear() < thisMonth.getFullYear() ))) {
                              
                              last3MonthsCount += result.y;
                            }

                            //do not include current month 
                            if(((result.x.getFullYear() === thirteenMonths.getFullYear() &&
                                result.x.getMonth() >= thirteenMonths.getMonth()) ||
                                (result.x.getFullYear() > thirteenMonths.getFullYear() ))&&
                                ((result.x.getFullYear() === thisMonth.getFullYear() &&
                                result.x.getMonth() < thisMonth.getMonth()) ||
                                (result.x.getFullYear() < thisMonth.getFullYear() ))) {
                              last12MonthsCount += result.y;
                            }

                            totalCount += result.y;
                            return result;
                          });
        _.forEach(res2.data.rows,function(item){
          var result = {
                          date : queryHelpersService.parseSlashDate(item.f[0].v),
                          count : parseInt(item.f[1].v)
                        };
          if (result.date.getMonth() === lastMonth.getMonth() && result.date.getFullYear() === lastMonth.getFullYear()){
            previousMonthTotalCompanies = result.count;
          } else if (result.date.getMonth() === twoMonths.getMonth() && result.date.getFullYear() === twoMonths.getFullYear()){
            twoMonthsAgoTotalCompanies = result.count;
          } else if (result.date.getMonth() === fiveMonths.getMonth() && result.date.getFullYear() === fiveMonths.getFullYear()){
            fourMonthsAgoTotalCompanies = result.count;
          } else if (result.date.getMonth() === fourteenMonths.getMonth() && result.date.getFullYear() === fourteenMonths.getFullYear()){
            thirteenMonthsAgoTotalCompanies = result.count;
          }
        });
        deferred.resolve({
          byDay : [ {key : "Actual", values : byDay},
                    { key : "Average", values : queryHelpersService.calculateNormalizedValues(byDay,30) }],
          today : todayCount,
          yesterday : yesterdayCount,
          total : totalCount,
          thisMonth : thisMonthCount / previousMonthTotalCompanies  * 100, 
          lastMonth : lastMonthCount / twoMonthsAgoTotalCompanies  * 100 ,
          last3Months : last3MonthsCount / fourMonthsAgoTotalCompanies * 100,
          last12Months : last12MonthsCount / thirteenMonthsAgoTotalCompanies * 100
        });
      })
      .then(null,function(e){
        deferred.reject(e);
      });

    return deferred.promise;
  };//getNewCompaniesByDay

  return service;
}]);