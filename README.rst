===============
☘ nanarinopage
===============

.. highlight:: bash


正經人誰寫日記：只是分享我的倒霉事。

點解不發表在Twitter上？：

1.日常🔒住 

2.上面有朋友可能只想看我嘅繪畫作品


运行
======

::

    # 我的環境 windows 11，choco 以及：
    $ elixir -v
    Erlang/OTP 26 [erts-14.2.2] [source] [64-bit] [smp:16:16] [ds:16:16:10] [async-threads:1] [jit:ns]

    Elixir 1.16.1 (compiled with Erlang/OTP 26)

    # 安裝和編譯依賴
    mix deps.get
    mix deps.compile

    # 運行和預覽
    mix serum.server


構建
======
::

    # 構建 輸出到site目錄
    mix serum.build


借物
======
* font: `悠哉 <https://github.com/lxgw/yozai-font>`_
