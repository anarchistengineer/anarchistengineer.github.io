#!/bin/bash

tools/build.sh

MAJOR=false
MINOR=false
PATCH=false
UPREV=false

THIS_FOLDER=`pwd`

PUSH=true
PUBLISH=true

Showhelp () {
  echo "./publish.sh <options>"
  echo ""
  echo "  Options"
  echo "    -h or --help - Show this screen"
  echo "    -v <version> or --version <version> - Set the version number explicitly"
  echo "    -M or --major - Increment Major version number, reset minor and patch"
  echo "    -m or --minor - Increment Minor version number, reset patch"
  echo "    -p or --patch - Increment Patch version number"
  echo "    --msg or --message - Set the commit message, if not supplied version will be used"
  echo "    --nopush - Don't push the changes to git"
  echo "    --nopublish - Don't publish on NPM"
  echo "    version - Output current version number"
  exit 0
}

while [[ $# > 0 ]]
do
  key="$1"
  case $key in
    -M|--major)
      MAJOR=true
      UPREV=true
    ;;
    -m|--minor)
      MINOR=true
      UPREV=true
    ;;
    -p|--patch)
      PATCH=true
      UPREV=true
    ;;
    -v|--version)
    VERSION="$2"
    shift
    ;;
    --msg|--message)
    MESSAGE="$2"
    shift
    ;;
    version)
    echo $VERSION
    exit
    ;;
    --nopush|--no-push)
    PUSH=false
    ;;
    --nopublish|--no-publish)
    PUBLISH=false
    ;;
    -h|--help)
    Showhelp
    ;;
    *)
    # unknown option
    ;;
  esac
  shift # past argument or value
done

git add .
git commit -m "$MESSAGE"

if [[ $ORIG_VERSION != $VERSION ]]; then
  npm version $VERSION
fi

if [[ $PUSH ]]; then
  echo "Pushing changes to git"
  git push origin master
fi

if [[ $PUBLISH && $ORIG_VERSION != $VERSION ]]; then
  read -p "Are you sure your ready to publish? (y/n) " -n 1 -r
  echo    # (optional) move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git subtree push --prefix site origin gh_pages
  else
    echo "Ok try again when your ready"
  fi
fi

echo "Done"
