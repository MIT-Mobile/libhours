// takes in the complete data object from the google doc/json file(s)
// and a js date object
// returns a hash (object) of libraries
// library object key is the library name
// library object value is an array of 7 "hours" strings
// each of the 7 corresponds to a day-of-the-week (0=monday, 6=sunday)
// the values are for the week in which the passed date object is in
// e.g. pass in December 16, and you get an object that contains hours for 
// monday-sunday of the week of the 16th, same if you pass in December 17,
// since that is in the same week.
function buildCompleteHoursObject(data, date) {
    // moment will accept lots of different date formats
    var moment_date = moment(date);

    // use that date to determine the monday of "this" week
    // clone insures we don't alter the original

    var start_date = moment_date.clone().subtract(moment_date.isoWeekday()-1, 'days');

    // array with date (using moment) for each day-of-week (dow) 0=monday, 6=sunday
    var dates_per_day = [];

    // array with name of day for each dow
    // this is needed because we need the spreadsheet to be human-readable
    var names_per_day = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];

    // hash of exceptions--hash of dates each contain a hash of lib names
    // (this could be reversed if that makes more sense)
    var exceptions = {};

    // hash of hours broken down by semester, location, day
    var hours_data = {};

    // array of semester for each dow--in case the semester changes in the middle of the week
    var semester_per_day = [];

    // hash of hours data for "this" week
    var hours = {};

    // exceptions must be accessed by date, then location
    // we have to do some strange iterations because of the format 
    // of the spreadsheet

    // skip first column name ("location"), it's not needed for processing, just for human editing
    _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exception_name) {
        // iterate through each library, creating an object for each
        // where the key is the location name, and the value is an object
        // each object should contain key/value pairs of date => hours
        // skip the first row of elements, because that just holds the dates themselves
        _.each(data['Holidays and Special Hours'].elements.slice(1), function(library) {
            exceptions[library.location] = exceptions[library.location] || {};

            // make sure there's an exception for this particular library for this exception name
            if (library[exception_name]) {
                var exception_date = data['Holidays and Special Hours'].elements[0][exception_name];

                exceptions[library.location][exception_date] = library[exception_name];
            }
        });
    });

    // hours_data must be access by semester, then location, then by day
    _.each(data['Semester Breakdown'].elements, function(semester) {
        hours_data[semester.semestername] = {};

        if (data[semester.semestername]) {
            _.each(data[semester.semestername].elements, function(location) {
                hours_data[semester.semestername][location.location] = location;
            });
        }
    });

    // run through each DOW for "this" week
    // determine what date the day is
    // determine which semester that date falls in
    // this is in case a semester changes in the middle of a week (is that possible?)
    for (var i=0; i < 7; i++) {
        var date = start_date.clone().add(i, 'days');
        
        dates_per_day.push(date);
        
        semester_per_day.push(_.find(data['Semester Breakdown'].elements, function(semester) {
            if (    date.isSame(semester.start, 'day') ||
                    date.isSame(semester.end, 'day') ||
                    (   date.isAfter(semester.start, 'day') &&
                        date.isBefore(semester.end, 'day'))) {
                return semester.semestername;
            }
        }));
    }

    // build hash of arrays (weekly hours) for display in template
    // lib name as key, value as array of hours for each DOW
        // for each lib
            // for each DOW
                // check date against lib exceptions list
                // check against lib tab hours
                // if no exceptions and no lib tab, use default hours from default hours object
    _.each(data['Holidays and Special Hours'].elements.slice(1), function(lib) {
        for (var i=0; i < 7; i++) {
            var library = lib.location;
            var date = dates_per_day[i].format('M/D/YYYY');
            var day_name = names_per_day[i];
            var semester = semester_per_day[i].semestername;

            hours[library] = hours[library] || {};

            if (exceptions[library] && exceptions[library][date]) {
                hours[library][i] = exceptions[library][date];
            }
            else if (hours_data[semester] && hours_data[semester][library] && hours_data[semester][library][day_name]) {
                hours[library][i] = hours_data[semester][library][day_name];
            }
            else {
                hours[library][i] = 'TBA';
            }
        }
    });

    return hours;
}

function buildNormalHoursObject(data, date) {
    // moment will accept lots of different date formats
    var moment_date = moment(date);

    // use that date to determine the monday of "this" week
    // clone insures we don't alter the original

    var start_date = moment_date.clone().subtract(moment_date.isoWeekday()-1, 'days');

    // array with date (using moment) for each day-of-week (dow) 0=monday, 6=sunday
    var dates_per_day = [];

    // array with name of day for each dow
    // this is needed because we need the spreadsheet to be human-readable
    var names_per_day = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];

    // hash of hours broken down by semester, location, day
    var hours_data = {};

    // array of semester for each dow--in case the semester changes in the middle of the week
    var semester_per_day = [];

    // array of hours data for "this" week
    var hours = {};
    var libraries = [];
    // hours_data must be access by semester, then library, then by day
    _.each(data['Semester Breakdown'].elements, function(semester) {
        hours_data[semester.semestername] = {};

        if (data[semester.semestername]) {
            _.each(data[semester.semestername].elements, function(library) {
                hours_data[semester.semestername][library.location] = library;
                libraries.push(library.location);
            });
        }
    });

    // run through each DOW for "this" week
    // determine what date the day is
    // determine which semester that date falls in
    // this is in case a semester changes in the middle of a week (is that possible?)
    for (var i=0; i < 7; i++) {
        var date = start_date.clone().add(i, 'days');
        
        dates_per_day.push(date);
        
        semester_per_day.push(_.find(data['Semester Breakdown'].elements, function(semester) {
            if (    date.isSame(semester.start, 'day') ||
                    date.isSame(semester.end, 'day') ||
                    (   date.isAfter(semester.start, 'day') &&
                        date.isBefore(semester.end, 'day'))) {
                return semester.semestername;
            }
        }));
    }

    // build hash of arrays (weekly hours) for display in template
    // lib name as key, value as array of hours for each DOW
    // for each DOW 
    // check against lib tab hours
        
    var dayLetters = ['M','T','W','R','F','S','U'];

    for (var b = 0; b < libraries.length; b++) {

        var library = libraries[b];

        //library = "Barker Library";
        var singleHours = [];
        for (var i = 0; i < 7; i++) {
            var date = dates_per_day[i].format('M/D/YYYY');
            var day_name = names_per_day[i];
            var semester = semester_per_day[i].semestername;

            var hoursObject = {};

            if (hours_data[semester] && hours_data[semester][library] && hours_data[semester][library][day_name]) {

                var dayHours = {};
                var splithours = hours_data[semester][library][day_name].split("-");
                dayHours['start'] = splithours[0];
                dayHours['end'] = splithours[1];

                if (singleHours.length) {
                    var poppedHoursObject = singleHours.pop();
                    var poppedHours = poppedHoursObject['hours'];
                    if (poppedHours['start'] == dayHours['start'] && poppedHours['end'] == dayHours['end']) {
                        poppedHoursObject['days'] = poppedHoursObject['days'].concat(dayLetters[i]);
                        singleHours.push(poppedHoursObject);
                    } else {
                        singleHours.push(poppedHoursObject);
                        hoursObject['hours'] = dayHours;
                        hoursObject['days'] = dayLetters[i];
                        singleHours.push(hoursObject);
                    }
                } else {
                    hoursObject['hours'] = dayHours;
                    hoursObject['days'] = dayLetters[i];
                    singleHours.push(hoursObject);
                }
            } else {
                hoursObject['hours'] = "TBA";
                hoursObject['days'] = dayLetters[i];
                singleHours.push(hoursObject);
            }
        }
        hours[library] = singleHours;
    }
    return hours;
}

function getSingleHoursObject(completeHoursObject, date, libname) {

    return completeHoursObject[libname][moment(date).isoWeekday()-1];
}

function getSemester(data) {

    var librarydates = {};

    _.each(data['Holidays and Special Hours'].elements.slice(1), function(library) {

        var singlelibrarydate = {};
        var closed = [];
        var exceptions = [];
        var closed_before_date;
        var exceptions_before_date;


         _.each(data['Holidays and Special Hours'].column_names.slice(1), function(exception_name) {

            if (library[exception_name]) {

                var exception_date = data['Holidays and Special Hours'].elements[0][exception_name];

                if (library[exception_name] == 'closed') {
                    
                    if (closed_before_date) {
                    
                        var today_date = exception_date;
                        
                        if (moment(today_date).isSame(moment(closed_before_date).add(1, 'day'))) {
                           
                            var singleException = closed.pop();
                            var dates = singleException['dates'];
                            dates['end'] = today_date
                            closed.push(singleException);

                        } else {
                                                                      
                            closed.push(buildClosingObject(exception_date, exception_name));

                        }

                    } else {
                                                                                      
                       closed.push(buildClosingObject(exception_date, exception_name));

                    }

                    closed_before_date = exception_date;
                
                } else {

                    if (exceptions_before_date) {

                        var today_date = exception_date;

                        if (moment(today_date).isSame(moment(exceptions_before_date).add(1, 'day'))) {

                            var hours = {};
                            var splithours = library[exception_name].split("-");

                            hours['start'] = splithours[0];
                            hours['end'] = splithours[1];

                            var singleException = exceptions.pop();

                            var newHours = singleException['hours'];

                            if (newHours['start'] == hours['start'] && newHours['end'] == hours['end']) {

                                var dates = singleException['dates'];
                                dates['end'] = today_date;
                                singleException['dates'] = dates;

                                exceptions.push(singleException);

                            } else {

                                exceptions.push(singleException);
                                
                                exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                            }

                        } else {

                            exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                        }

                    } else {

                        exceptions.push(buildExceptionObject(exception_date, exception_name, library[exception_name]));

                    }

                    exceptions_before_date = exception_date;

                }

            }

        });
        
        singlelibrarydate['closings'] = closed;
        singlelibrarydate['exceptions'] = exceptions;
        librarydates[library.location] = singlelibrarydate;
    
    });

    return librarydates;

}

function buildClosingObject(exception_date, exception_name) {

    var dates = {};
    dates['start'] = exception_date;
    dates['end'] = exception_date;

    var singleClosing = {};
    singleClosing['dates'] = dates;
    singleClosing['reason'] = exception_name;
    return singleClosing;
}

function buildExceptionObject(exception_date, exception_name, splithours) {

    var dates = {};
    dates['start'] = exception_date;
    dates['end'] = exception_date;

    var singleException = {};                        
    singleException['dates'] = dates;
    singleException['reason'] = exception_name;

    var hours = {};
    splithours = splithours.split("-");

    hours['start'] = splithours[0];
    hours['end'] = splithours[1];

    singleException['hours'] = hours;

    return singleException;
}

