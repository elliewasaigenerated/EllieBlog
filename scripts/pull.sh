rsync -avP -e ssh --exclude='*.png' --exclude='*.jpg' --exclude='*.zip' $1:~/Blog/src/ .
