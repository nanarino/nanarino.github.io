==============
☘ nanarino.art
==============

.. highlight:: bash


正經人誰寫日記。


先決條件
========

安裝 Erlang/OTP + rebar3 + Gleam。

::

    # 下載 gleam.toml 中的依賴並編譯
    gleam deps download
    gleam build


首次運行或打包時，Lustre 會自動下載 Bun 用來打包 JavaScript。


運行
========

::

    # 運行和預覽
    gleam run -m lustre/dev start


構建
========
::

    # 構建 輸出到dist目錄
    gleam run -m lustre/dev build


由於 ``assets/**/*`` 並未參與構建，是請求來的靜態資源，因此修改文案同自訂樣式後無需再次構建。
