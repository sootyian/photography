import gulp from 'gulp';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import filter from 'gulp-filter';
import path from 'path';
import del from 'del';
import sharp from 'sharp';

const sass = gulpSass(dartSass);

const cssSourceGlob = './assets/sass/**/*.scss';
const cssOutputDir = './assets/css';

const generatedCssFiles = [
    `${cssOutputDir}/custom.min.css`,
    `${cssOutputDir}/main.min.css`,
    `${cssOutputDir}/noscript.min.css`
];

/* ---------------- CLEAN ---------------- */

gulp.task('delete', function () {
    return del(['images/fulls/**/*', 'images/thumbs/**/*']);
});

gulp.task('clean-css', function () {
    return del(generatedCssFiles);
});

/* ---------------- IMAGES (SHARP + AUTO CONVERT) ---------------- */

gulp.task('resize-images', async function () {
    const files = await new Promise((resolve, reject) => {
        const out = [];

        gulp.src('images/*.*')
            .on('data', file => out.push(file.path))
            .on('end', () => resolve(out))
            .on('error', reject);
    });

    await Promise.all(
        files.map(async (filePath) => {
            const fileName = path.parse(filePath).name + '.jpg';

            try {
                const input = sharp(filePath, {
                    failOnError: false,
                    unlimited: true
                });

                const buffer = await input
                    .rotate()
                    .jpeg({ quality: 85 })
                    .toBuffer();

                await sharp(buffer)
                    .resize({ width: 1024 })
                    .jpeg({ quality: 85 })
                    .toFile(`images/fulls/${fileName}`);

                await sharp(buffer)
                    .resize({ width: 512 })
                    .jpeg({ quality: 80 })
                    .toFile(`images/thumbs/${fileName}`);

            } catch (err) {
                console.warn(`Skipping broken image: ${filePath}`);
            }
        })
    );
});

/* ---------------- SASS ---------------- */

gulp.task('sass', gulp.series('clean-css', function compileSass() {
    return gulp.src(cssSourceGlob)
        .pipe(
            sass({ outputStyle: 'compressed' })
                .on('error', sass.logError)
        )
        .pipe(rename(function (filePath) {
            filePath.basename += '.min';
        }))
        .pipe(gulp.dest(cssOutputDir));
}));

gulp.task('sass:watch', function () {
    gulp.watch(cssSourceGlob, gulp.series('sass'));
});

/* ---------------- JS ---------------- */

gulp.task('minify-js', function () {
    return gulp.src('./assets/js/**/*.js')
        .pipe(filter(file => !file.path.endsWith('.min.js')))
        .pipe(uglify())
        .pipe(rename(function (filePath) {
            filePath.basename += '.min';
            filePath.extname = '.js';
        }))
        .pipe(gulp.dest('./assets/js'));
});

/* ---------------- TASKS ---------------- */

gulp.task('build', gulp.series('sass', 'minify-js'));

gulp.task('resize', gulp.series('delete', 'resize-images'));

gulp.task('default', gulp.series('build', 'resize'));