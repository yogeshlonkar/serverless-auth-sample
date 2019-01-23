
```shell
$ ssh-keygen -t rsa -b 4096 -m PEM -f __test__/private.key
$ openssl rsa -in __test__/private.key -pubout -outform PEM -out __test__/public.key
```