const jenkins = require('jenkins')({ baseUrl: 'http://admin:1q2w3e4r5t@localhost:8080', crumbIssuer: true, promisify: true });;
const Rx = require('rxjs');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const Duration = require('js-joda').Duration;

const screen = blessed.screen();
var grid = new contrib.grid({
  rows : 2
  ,cols : 4
  ,screen : screen
});

var tableData = {
   headers: ['Name', 'Last Success', 'Last Failure', 'Last Duration'],
   data: []
}

const table = grid.set(0,1,2,3, contrib.table, { keys: true
, vi: true
, fg: 'white'
, selectedFg: 'white'
, selectedBg: 'blue'
, interactive: true
, label: 'jenkins-term'
, width: '100%'
, height: '80%'
, border: {type: "line", fg: "cyan"}
, columnSpacing: 5
, columnWidth: [20, 15, 15, 15]});

table.focus();

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

const complete = function() {
  screen.render();
}

const error = function(e) {
  console.log(e);
}

const getBuildNumber = function(build) {
  return build? '#' + build.number : 'N/A';
}

const getBuildDuration = function(build) {
  if(build === null) {
    return 'N/A';
  }

  var isoDuration = Duration.ofMillis(build.duration).withNanos(0).toString();

  return isoDuration.replace('PT','').replace('H', ' hr ').replace('M', ' min ').replace('S', ' sec ');
}

const jobsObservable = Rx.Observable.fromPromise(jenkins.job.list())
  .flatMap(jobs=> Rx.Observable.from(jobs))
  .flatMap(job=>Rx.Observable.fromPromise(jenkins.job.get(job.name)));

const lastBuildObservable = jobsObservable
  .flatMap(job=>Rx.Observable.fromPromise(jenkins.build.get(job.name, job.lastBuild.number)));

Rx.Observable.zip(jobsObservable, lastBuildObservable, (job, lastBuild) => [job.name, getBuildNumber(job.lastSuccessfulBuild), getBuildNumber(job.lastFailedBuild), getBuildDuration(lastBuild)])
  .subscribe(row => {
    tableData.data.push(row);
    table.setData(tableData);
  },error,complete);
