var gulp = require('gulp'),
    gulp_clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    sourcemaps = require("gulp-sourcemaps");


var folder = {
    src: 'src',
    dist: 'dist'
};

gulp.task('clean-dist-folder', function () {
    return gulp.src(folder.dist, {read: false})
        .pipe(gulp_clean());
});

gulp.task('js__concat', ['clean-dist-folder'], function () {
    return gulp.src(['src/dialog_button.js', 'src/dialog.js', 'src/dialog_helpers.js'])
    // .pipe(sourcemaps.init())
        .pipe(concat('dialog.js'))
        // .pipe(sourcemaps.write())
        .pipe(gulp.dest(folder.dist));
});

gulp.task('js_template_concat', ['clean-dist-folder'], function () {
    return gulp.src(['src/templates/Dialog/bootstrap.js', 'src/templates/DialogButton/bootstrap.js'])
    // .pipe(sourcemaps.init())
        .pipe(concat('bootstrap.js'))
        // .pipe(sourcemaps.write())
        .pipe(gulp.dest(folder.dist + '/template'));
});

gulp.task('js__uglify', ['js__concat'], function () {

    return gulp.src(folder.dist + '/dialog.js')
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(folder.dist));
});

gulp.task('js_template_uglify', ['js_template_concat'], function () {

    return gulp.src(folder.dist + '/template/bootstrap.js')
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(folder.dist + '/template'));
});


gulp.task('js', ['clean-dist-folder', 'js__concat', 'js_template_concat', 'js__uglify', 'js_template_uglify']);
gulp.task('default', ['js']);