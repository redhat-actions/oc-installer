First you need to create the template (change the filename based on your system)
`oc create -f template.yml`

Then you need to create all resources by using the template (change the repo url and name based on your needs)
`oc new-app --template quasar-web-app -p SOURCE_REPOSITORY_URL=https://github.com/lstocchi/quasar-geolocation-example.git --name=myquasarapp`

Make sure you add the right build command to your package.json app by using the `"build"` field. In our example we are making use of Quasar to compile our code -> `"build": "quasar build"`. 
The build command will get called automatically during the first build (the exact call is npm run build)

To trigger the build just use
`oc start-build quasar-web-app-builder`